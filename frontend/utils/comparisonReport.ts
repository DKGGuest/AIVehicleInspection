import { GeminiAnalysisResult } from './geminiAnalysis';
import * as Diff from 'diff';
import { PHOTO_CONFIG } from './carDetection';

export interface FieldChange {
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'removed' | 'changed' | 'unchanged';
}

export interface AngleDiff {
    label: string;
    index: number;
    hasChanges: boolean;
    changes: FieldChange[];
}

export interface StructuredDiffSummary {
    summary: string;
    angles: AngleDiff[];
    overallConfirm: boolean; // boolean if any changes detected
}

export const compareStructuredReports = (oldResults: GeminiAnalysisResult[], newResults: GeminiAnalysisResult[]): StructuredDiffSummary => {
    // Assuming results align by index (0..n). If length differs, we handle min length, or assume fix set of angles.
    // PHOTO_CONFIG is the source of truth for angles.

    // Create a map or just iterate. Since array index matters:
    const anglesDiff: AngleDiff[] = [];
    let differencesFound = false;

    // We'll iterate up to the max length, but typically they should match PHOTO_CONFIG length
    const maxLen = Math.max(oldResults.length, newResults.length);

    for (let i = 0; i < maxLen; i++) {
        const oldItem = oldResults[i];
        const newItem = newResults[i];
        const label = PHOTO_CONFIG[i]?.label || `Angle ${i + 1}`;

        const angleChanges: FieldChange[] = [];

        if (!oldItem && newItem) {
            angleChanges.push({ field: 'Record', oldValue: null, newValue: 'Present', type: 'added' });
        } else if (oldItem && !newItem) {
            angleChanges.push({ field: 'Record', oldValue: 'Present', newValue: null, type: 'removed' });
        } else if (oldItem && newItem) {
            // Compare fields: severity, damageType, description
            // 1. Severity
            if (oldItem.severity !== newItem.severity) {
                angleChanges.push({
                    field: 'Severity',
                    oldValue: oldItem.severity,
                    newValue: newItem.severity,
                    type: 'changed'
                });
            }

            // 2. Damage Type (array or string?) - Interface says string usually
            if (oldItem.damageType !== newItem.damageType) {
                angleChanges.push({
                    field: 'Damage Type',
                    oldValue: oldItem.damageType,
                    newValue: newItem.damageType,
                    type: 'changed'
                });
            }

            // 3. Description (Text Diff)
            if (oldItem.description !== newItem.description) {
                // Use Diff.diffWords to find specific word changes if we want detailed text diff
                // For structure, we can just say it changed, or provide the diff objects
                // Let's just flag it as changed for now to keep UI simple
                angleChanges.push({
                    field: 'Description',
                    oldValue: oldItem.description,
                    newValue: newItem.description,
                    type: 'changed'
                });
            }

            // 4. Damage Boolean
            if (oldItem.hasDamage !== newItem.hasDamage) {
                angleChanges.push({
                    field: 'Has Damage',
                    oldValue: oldItem.hasDamage ? 'Yes' : 'No',
                    newValue: newItem.hasDamage ? 'Yes' : 'No',
                    type: 'changed'
                });
            }
        }

        if (angleChanges.length > 0) differencesFound = true;

        anglesDiff.push({
            label,
            index: i,
            hasChanges: angleChanges.length > 0,
            changes: angleChanges
        });
    }

    return {
        summary: differencesFound ? 'Differences detected between reports.' : 'No significant structural differences.',
        angles: anglesDiff.filter(a => a.hasChanges), // Only return relevant
        overallConfirm: differencesFound
    };
};

