import * as snmp from 'net-snmp';
import { SnmpConfig, SnmpResult, DiskInfo, DiskConfig } from '../types/server';
import { SNMP_COMMUNITY } from '../config/constants';

// Host Resources MIB OIDs for storage information
const HR_STORAGE_BASE = '1.3.6.1.2.1.25.2.3.1';
const HR_STORAGE_DESCR = `${HR_STORAGE_BASE}.3`;     // hrStorageDescr
const HR_STORAGE_ALLOCATION_UNITS = `${HR_STORAGE_BASE}.4`; // hrStorageAllocationUnits
const HR_STORAGE_SIZE = `${HR_STORAGE_BASE}.5`;      // hrStorageSize
const HR_STORAGE_USED = `${HR_STORAGE_BASE}.6`;      // hrStorageUsed

export class SnmpService {
  private static readonly TIMEOUT = 5000; // 5 second timeout
  private static readonly RETRIES = 1;

  public static async getDiskInfo(dnsAddress: string, snmpConfig: SnmpConfig): Promise<SnmpResult> {
    if (!snmpConfig.enabled) {
      return { success: false, error: 'SNMP not enabled' };
    }

    // Support both new disks format and legacy storageIndexes format
    const disksToQuery: DiskConfig[] = snmpConfig.disks || 
      snmpConfig.storageIndexes?.map(index => ({ index })) || [];

    if (disksToQuery.length === 0) {
      return { success: false, error: 'No storage indexes or disks configured' };
    }

    try {
      const indexes = disksToQuery.map(d => d.index);
      console.log(`📊 Querying SNMP disk info for ${dnsAddress} (indexes: ${indexes.join(', ')})`);
      
      const session = snmp.createSession(dnsAddress, SNMP_COMMUNITY, {
        port: 161,
        retries: this.RETRIES,
        timeout: this.TIMEOUT,
        version: snmp.Version.Version2c,
      });

      const diskInfoPromises = disksToQuery.slice(0, 3).map((diskConfig) => 
        this.queryStorageIndex(session, diskConfig.index, diskConfig.name),
      );

      const results = await Promise.allSettled(diskInfoPromises);
      
      // Close SNMP session
      session.close();

      const diskInfo: DiskInfo[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          diskInfo.push(result.value);
        } else if (result.status === 'rejected') {
          errors.push(`Index ${disksToQuery[index].index}: ${result.reason}`);
        }
      });

      if (diskInfo.length === 0) {
        return { 
          success: false, 
          error: `No disk data retrieved. Errors: ${errors.join('; ')}`, 
        };
      }

      console.log(`✅ ${dnsAddress}: Retrieved ${diskInfo.length} disk(s)`);
      return { success: true, diskInfo };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown SNMP error';
      console.log(`❌ ${dnsAddress}: SNMP error - ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  private static async queryStorageIndex(session: any, index: number, customName?: string): Promise<DiskInfo | null> {
    const oids = [
      `${HR_STORAGE_DESCR}.${index}`,
      `${HR_STORAGE_ALLOCATION_UNITS}.${index}`,
      `${HR_STORAGE_SIZE}.${index}`,
      `${HR_STORAGE_USED}.${index}`,
    ];

    return new Promise((resolve, reject) => {
      session.get(oids, (error: any, varbinds: any[]) => {
        if (error) {
          reject(`SNMP get error: ${error.message}`);
          return;
        }

        try {
          // Check if all OIDs returned valid data
          const hasErrors = varbinds.some(vb => 
            snmp.isVarbindError(vb) || vb.value === null || vb.value === undefined,
          );

          if (hasErrors) {
            const errorDetails = varbinds
              .filter(vb => snmp.isVarbindError(vb))
              .map(vb => `${vb.oid}: ${snmp.varbindError(vb)}`)
              .join(', ');
            reject(`Storage index ${index} error: ${errorDetails || 'No data available'}`);
            return;
          }

          const [descrVb, allocUnitsVb, sizeVb, usedVb] = varbinds;
          
          const description = descrVb.value.toString();
          const allocationUnits = parseInt(allocUnitsVb.value.toString());
          const size = parseInt(sizeVb.value.toString());
          const used = parseInt(usedVb.value.toString());

          // Calculate actual bytes (size and used are in allocation units)
          const totalBytes = size * allocationUnits;
          const usedBytes = used * allocationUnits;
          const freeBytes = totalBytes - usedBytes;
          const percentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

          // Convert bytes to MB for consistency with frontend
          const diskInfo: DiskInfo = {
            total: Math.round(totalBytes / (1024 * 1024)), // MB
            used: Math.round(usedBytes / (1024 * 1024)),   // MB
            free: Math.round(freeBytes / (1024 * 1024)),   // MB
            percentage,
            description,
            index,
            name: customName, // Add custom name if provided
          };

          resolve(diskInfo);

        } catch (parseError) {
          reject(`Failed to parse SNMP data for index ${index}: ${parseError}`);
        }
      });
    });
  }
}