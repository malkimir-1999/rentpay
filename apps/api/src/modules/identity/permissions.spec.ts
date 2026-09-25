import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions';
describe('permission evaluator', () => { it('allows granted capability', () => expect(hasPermission(['vehicle.view'], 'vehicle.view')).toBe(true)); it('denies absent capability', () => expect(hasPermission(['vehicle.view'], 'vehicle.manage')).toBe(false)); });
