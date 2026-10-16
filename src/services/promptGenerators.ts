/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIToolId, PromptPreset, AI_TOOLS } from '../types';

export interface PromptExportResult {
  toolId: AIToolId;
  toolName: string;
  filePath: string;
  fileName: string;
  content: string;
  presetName: string;
  hasActivePrompt: boolean;
}

/**
 * Returns prompt target filename and file path for a given tool and preset
 */
export function getPromptTargetMeta(toolId: AIToolId, preset?: PromptPreset): {
  filePath: string;
  fileName: string;
  description: string;
} {
  if (toolId === 'pi' && preset?.piPromptType) {
    if (preset.piPromptType === 'SYSTEM') {
      return {
        filePath: '~/.pi/agent/SYSTEM.md',
        fileName: 'SYSTEM.md',
        description: 'Complete base system instructions for Pi. Replacing this overrides default tool behavioral directives.',
      };
    }
    if (preset.piPromptType === 'APPEND_SYSTEM') {
      return {
        filePath: '~/.pi/agent/APPEND_SYSTEM.md',
        fileName: 'APPEND_SYSTEM.md',
        description: 'Appends rules onto Pi default system prompts without erasing built-in base system guidelines.',
      };
    }
  }

  const meta = AI_TOOLS[toolId];
  return {
    filePath: meta.promptPath,
    fileName: meta.promptFilename,
    description: `Standard system instructions & agent guidelines for ${meta.name}.`,
  };
}

/**
 * Generates prompt export for an active preset
 */
export function generatePromptExport(toolId: AIToolId, activePreset?: PromptPreset): PromptExportResult {
  const meta = getPromptTargetMeta(toolId, activePreset);
  if (!activePreset) {
    return {
      toolId,
      toolName: AI_TOOLS[toolId].name,
      filePath: meta.filePath,
      fileName: meta.fileName,
      content: '',
      presetName: 'None (Disabled)',
      hasActivePrompt: false,
    };
  }

  return {
    toolId,
    toolName: AI_TOOLS[toolId].name,
    filePath: meta.filePath,
    fileName: meta.fileName,
    content: activePreset.content,
    presetName: activePreset.name,
    hasActivePrompt: true,
  };
}
