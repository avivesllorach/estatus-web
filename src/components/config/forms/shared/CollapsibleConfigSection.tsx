import { ReactNode, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

interface CollapsibleConfigSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleConfigSection({
  title,
  defaultOpen = false,
  children
}: CollapsibleConfigSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        {/* Collapsible Header */}
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 transition-colors"
            aria-expanded={isOpen}
          >
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <ChevronRight
              className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
                isOpen ? 'rotate-90' : ''
              }`}
            />
          </button>
        </CollapsibleTrigger>

        {/* Collapsible Content */}
        <CollapsibleContent className="px-6 pb-6 pt-2">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
