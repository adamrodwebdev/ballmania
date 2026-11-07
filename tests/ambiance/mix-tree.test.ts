import { describe, expect, it } from 'vitest';
import { mixTree } from '../../marketing/ambiance/AmbientVoices';

/** A node that counts what connects into it: enough of Web Audio for the mixing tree. */
class CountingNode {
  inputs = 0;
  connect(target: CountingNode): CountingNode {
    target.inputs++;
    return target;
  }
}

const context = () => {
  const created: CountingNode[] = [];
  const ctx = {
    createGain: () => {
      const node = new CountingNode();
      created.push(node);
      return node;
    },
  };
  return { ctx: ctx as unknown as BaseAudioContext, created };
};

describe('the mixing tree', () => {
  it.each([1, 2, 3, 7, 450])(
    'mixes %i notes with never more than two inputs to a node, so the sum is exact',
    (count) => {
      const { ctx, created } = context();
      const notes = Array.from({ length: count }, () => new CountingNode());
      const root = mixTree(ctx, notes as unknown as AudioNode[]);
      expect(root).not.toBeNull();
      expect(created.filter((node) => node.inputs > 2)).toEqual([]);
      expect(created.reduce((sum, node) => sum + node.inputs, 0)).toBe(count + created.length - 1);
    },
  );

  it('mixes nothing into nothing', () => {
    expect(mixTree(context().ctx, [])).toBeNull();
  });
});
