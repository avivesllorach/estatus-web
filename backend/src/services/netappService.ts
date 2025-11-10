import * as https from 'https';
import { NetAppConfig, NetAppResult, DiskInfo, LunConfig } from '../types/server';

export class NetAppService {
    private static readonly TIMEOUT = 10000; // 10 second timeout
    private static readonly API_VERSION = 'api/storage/luns';

    public static async getLunInfo(hostname: string, netappConfig: NetAppConfig): Promise<NetAppResult> {
        if (!netappConfig.enabled) {
            return { success: false, error: 'NetApp monitoring not enabled' };
        }

        if (!netappConfig.luns || netappConfig.luns.length === 0) {
            return { success: false, error: 'No LUNs configured' };
        }

        try {
            const apiType = netappConfig.apiType || 'rest';
            console.log(`🗄️ Querying NetApp LUN info for ${hostname} (${netappConfig.luns.length} LUNs) via ${apiType.toUpperCase()}`);

            if (apiType === 'zapi') {
                return await this.getLunInfoZapi(hostname, netappConfig);
            }

            // Default: REST (ONTAP 9 REST API)
            // Get all LUNs first to find UUIDs by path
            const lunsData = await this.getAllLuns(hostname, netappConfig);
            if (!lunsData.success) {
                return { success: false, error: lunsData.error };
            }

            // Filter LUNs by configured paths and get metrics for each
            const configuredLuns = lunsData.luns?.filter(lun =>
                netappConfig.luns.some(config => config.path === lun.name)
            ) || [];

            if (configuredLuns.length === 0) {
                return { success: false, error: 'No configured LUNs found on NetApp system' };
            }

            const lunInfoPromises = configuredLuns.slice(0, 3).map(lun => {
                const config = netappConfig.luns.find(c => c.path === lun.name);
                return this.getLunMetrics(hostname, netappConfig, lun.uuid, (config && config.name) || lun.name);
            });

            const results = await Promise.allSettled(lunInfoPromises);

            const diskInfo: DiskInfo[] = [];
            const errors: string[] = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    diskInfo.push(result.value);
                } else if (result.status === 'rejected') {
                    errors.push(`LUN ${configuredLuns[index].name}: ${result.reason}`);
                }
            });

            if (diskInfo.length === 0) {
                return {
                    success: false,
                    error: `No LUN data retrieved. Errors: ${errors.join('; ')}`
                };
            }

            console.log(`✅ ${hostname}: Retrieved ${diskInfo.length} LUN(s)`);
            return { success: true, diskInfo };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown NetApp error';
            console.log(`❌ ${hostname}: NetApp error - ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }

    private static async getAllLuns(hostname: string, netappConfig: NetAppConfig): Promise<{ success: boolean, luns?: any[], error?: string }> {
        const endpoint = `/api/storage/luns`;

        return new Promise((resolve) => {
            const auth = Buffer.from(`${netappConfig.username}:${netappConfig.password}`).toString('base64');

            const options: https.RequestOptions = {
                hostname: hostname,
                port: 443,
                path: endpoint,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                rejectUnauthorized: false, // Accept self-signed certificates
                timeout: this.TIMEOUT
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) {
                            resolve({ success: false, error: `HTTP ${res.statusCode}: ${res.statusMessage}` });
                            return;
                        }

                        const response = JSON.parse(data);
                        if (response.records) {
                            resolve({ success: true, luns: response.records });
                        } else {
                            resolve({ success: false, error: 'No LUN records found in response' });
                        }
                    } catch (parseError) {
                        resolve({ success: false, error: `Failed to parse response: ${parseError}` });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({ success: false, error: `Request error: ${error.message}` });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });

            req.end();
        });
    }

    private static async getLunMetrics(hostname: string, netappConfig: NetAppConfig, lunUuid: string, lunName: string): Promise<DiskInfo | null> {
        const endpoint = `/api/storage/luns/${lunUuid}?fields=space`;

        return new Promise((resolve, reject) => {
            const auth = Buffer.from(`${netappConfig.username}:${netappConfig.password}`).toString('base64');

            const options: https.RequestOptions = {
                hostname: hostname,
                port: 443,
                path: endpoint,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                rejectUnauthorized: false, // Accept self-signed certificates
                timeout: this.TIMEOUT
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) {
                            reject(`HTTP ${res.statusCode}: ${res.statusMessage}`);
                            return;
                        }

                        const response = JSON.parse(data);

                        if (!response.space) {
                            reject('No space information available for LUN');
                            return;
                        }

                        const space = response.space;
                        const totalBytes = space.size || 0;
                        const usedBytes = space.used || 0;
                        const freeBytes = totalBytes - usedBytes;
                        const percentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

                        // Convert bytes to MB for consistency with frontend
                        const diskInfo: DiskInfo = {
                            total: Math.round(totalBytes / (1024 * 1024)), // MB
                            used: Math.round(usedBytes / (1024 * 1024)),   // MB
                            free: Math.round(freeBytes / (1024 * 1024)),   // MB
                            percentage,
                            description: `LUN: ${response.name || lunName}`,
                            name: lunName
                        };

                        resolve(diskInfo);

                    } catch (parseError) {
                        reject(`Failed to parse LUN metrics for ${lunName}: ${parseError}`);
                    }
                });
            });

            req.on('error', (error) => {
                reject(`Request error for LUN ${lunName}: ${error.message}`);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(`Request timeout for LUN ${lunName}`);
            });

            req.end();
        });
    }

    // ZAPI (ONTAPI) implementation using XML over HTTPS
    private static async getLunInfoZapi(hostname: string, netappConfig: NetAppConfig): Promise<NetAppResult> {
        try {
            const allLuns = await this.getAllLunsZapi(hostname, netappConfig);
            if (!allLuns.success || !allLuns.luns) {
                return { success: false, error: allLuns.error || 'Failed to retrieve LUNs via ZAPI' };
            }

            // Map by path for quick lookup
            const pathToRecord = new Map<string, { path: string; size?: number; sizeUsed?: number }>();
            allLuns.luns.forEach(l => {
                pathToRecord.set(l.path, l);
            });

            const diskInfo: DiskInfo[] = [];
            const errors: string[] = [];

            netappConfig.luns.slice(0, 3).forEach(cfg => {
                const lun = pathToRecord.get(cfg.path);
                if (!lun) {
                    errors.push(`Configured LUN not found: ${cfg.path}`);
                    return;
                }

                const totalBytes = lun.size || 0;
                const usedBytes = lun.sizeUsed || 0;
                const freeBytes = totalBytes - usedBytes;
                const percentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

                diskInfo.push({
                    total: Math.round(totalBytes / (1024 * 1024)),
                    used: Math.round(usedBytes / (1024 * 1024)),
                    free: Math.round(freeBytes / (1024 * 1024)),
                    percentage,
                    description: `LUN: ${cfg.path}`,
                    name: cfg.name || cfg.path
                });
            });

            if (diskInfo.length === 0) {
                return { success: false, error: errors.join('; ') || 'No matching LUNs via ZAPI' };
            }

            console.log(`✅ ${hostname}: Retrieved ${diskInfo.length} LUN(s) via ZAPI`);
            return { success: true, diskInfo };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { success: false, error: msg };
        }
    }

    private static async getAllLunsZapi(hostname: string, netappConfig: NetAppConfig): Promise<{ success: boolean, luns?: Array<{ path: string; size?: number; sizeUsed?: number }>, error?: string }> {
        const endpoint = `/servlets/netapp.servlets.admin.XMLrequest_filer`;

        const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>\n<netapp xmlns="http://www.netapp.com/filer/admin" version="1.21">\n  <lun-get-iter>\n    <max-records>1000</max-records>\n  </lun-get-iter>\n</netapp>`;

        return new Promise((resolve) => {
            const auth = Buffer.from(`${netappConfig.username}:${netappConfig.password}`).toString('base64');

            const options: https.RequestOptions = {
                hostname: hostname,
                port: 443,
                path: endpoint,
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'text/xml',
                    'Content-Type': 'text/xml'
                },
                rejectUnauthorized: false,
                timeout: this.TIMEOUT
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        resolve({ success: false, error: `HTTP ${res.statusCode}: ${res.statusMessage}` });
                        return;
                    }

                    try {
                        const luns = NetAppService.parseZapiLunResponse(data);
                        resolve({ success: true, luns });
                    } catch (parseErr) {
                        resolve({ success: false, error: `Failed to parse ZAPI XML: ${parseErr}` });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({ success: false, error: `Request error: ${error.message}` });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });

            req.write(xmlBody);
            req.end();
        });
    }

    private static parseZapiLunResponse(xml: string): Array<{ path: string; size?: number; sizeUsed?: number }> {
        const results: Array<{ path: string; size?: number; sizeUsed?: number }> = [];

        // Extract each <lun-info>...</lun-info> block
        const lunBlocks = xml.match(/<lun-info>[\s\S]*?<\/lun-info>/g) || [];
        lunBlocks.forEach(block => {
            const pathMatch = block.match(/<path>([^<]+)<\/path>/);
            if (!pathMatch) return;
            const sizeMatch = block.match(/<size>(\d+)<\/size>/);
            const sizeUsedMatch = block.match(/<size-used>(\d+)<\/size-used>/);

            const path = pathMatch[1];
            const size = sizeMatch ? parseInt(sizeMatch[1], 10) : undefined;
            const sizeUsed = sizeUsedMatch ? parseInt(sizeUsedMatch[1], 10) : undefined;

            results.push({ path, size, sizeUsed });
        });

        return results;
    }
}