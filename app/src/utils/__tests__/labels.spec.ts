// app/src/utils/__tests__/labels.spec.ts
//
// Regression lock (TASK-011 fast-follow): singularLabelForType must not
// naively strip a trailing "s" off the plural label — that mangles
// irregular plurals ("People" -> "Peopl", "Companies" -> "Companie") and
// produced garbled empty-state text on the /query page.
import { describe, expect, it } from 'vitest';
import { singularLabelForType } from '../labels';

describe('singularLabelForType', () => {
  it('singularizes irregular plurals correctly', () => {
    expect(singularLabelForType('person')).toBe('Person');
    expect(singularLabelForType('company')).toBe('Company');
  });

  it('singularizes the rest of the known types', () => {
    expect(singularLabelForType('yacht')).toBe('Yacht');
    expect(singularLabelForType('marina')).toBe('Marina');
    expect(singularLabelForType('region')).toBe('Region');
    expect(singularLabelForType('club')).toBe('Yacht Club');
    expect(singularLabelForType('builder')).toBe('Builder');
    expect(singularLabelForType('engine')).toBe('Engine');
    expect(singularLabelForType('designer')).toBe('Designer');
    // TASK-016: shipyard/dry-dock facility entity type.
    expect(singularLabelForType('shipyard')).toBe('Shipyard');
    // TASK-017: engine model, part, and size class entity types.
    expect(singularLabelForType('engine_model')).toBe('Engine Model');
    expect(singularLabelForType('part')).toBe('Part');
    expect(singularLabelForType('size_class')).toBe('Size Class');
  });

  it('falls back to a capitalized guess for an unknown type', () => {
    expect(singularLabelForType('widget')).toBe('Widget');
  });
});
