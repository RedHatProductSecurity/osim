import type { App } from 'vue';
import { computed, nextTick } from 'vue';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { blankFlaw, useFlaw } from '@/composables/useFlaw';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import { withSetup } from '@/__tests__/helpers';

import { useAISuggestionsWatcher } from '../useAISuggestionsWatcher';

type Watcher = ReturnType<typeof useAISuggestionsWatcher>;

describe('useAISuggestionsWatcher', () => {
  let app: App | undefined;
  const { flaw, flawResyncCount, isFlawUpdated, resetFlaw, setFlaw } = useFlaw();
  const tracking = useAegisMetadataTracking();

  beforeEach(() => {
    app?.unmount();
    app = undefined;
    resetFlaw();
    tracking.setAegisMetadata({});
    setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid-1', cve_description: 'Original description' });
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
  });

  /** Mounts a watcher bound to flaw.cve_description the way FlawForm wires it. */
  function mountWatcher(): Watcher {
    const descriptionRef = computed({
      get: () => flaw.value.cve_description,
      set: (value) => { flaw.value.cve_description = value; },
    });
    const [watcher, mountedApp] = withSetup(
      () => useAISuggestionsWatcher('cve_description', descriptionRef),
      [],
    );
    app = mountedApp;
    return watcher;
  }

  function metadataEntries() {
    return tracking.getAegisMetadata().cve_description ?? [];
  }

  describe('flaw model resyncs', () => {
    it('restores an applied suggestion wiped by a same-flaw model resync', async () => {
      const watcher = mountWatcher();

      expect(watcher.applyAISuggestion('AI description')).toBe(true);
      expect(flaw.value.cve_description).toBe('AI description');
      await nextTick();

      // A post-save sync or refetch replaces the model with a new object for
      // the same uuid whose field still carries the pre-suggestion value.
      const resyncCount = flawResyncCount.value;
      setFlaw({ ...flaw.value, cve_description: 'Original description' });
      await nextTick();

      expect(flawResyncCount.value).toBe(resyncCount + 1);
      expect(flaw.value.cve_description).toBe('AI description');
      expect(watcher.hasAppliedSuggestion.value).toBe(true);
      expect(isFlawUpdated.value).toBe(true);
      const aiEntries = metadataEntries().filter(entry => entry.type === 'AI');
      expect(aiEntries).toHaveLength(1);
      expect(aiEntries[0].value).toBe('AI description');
    });

    it('keeps the server value when the resync changed the field on the server', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      setFlaw({ ...flaw.value, cve_description: 'Edited on the server' });
      await nextTick();

      expect(flaw.value.cve_description).toBe('Edited on the server');
    });

    it('does not restore a suggestion the user reverted before the resync', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      watcher.revertAISuggestion();
      expect(flaw.value.cve_description).toBe('Original description');
      expect(watcher.hasAppliedSuggestion.value).toBe(false);
      await nextTick();

      setFlaw({ ...flaw.value, cve_description: 'Original description' });
      await nextTick();

      expect(flaw.value.cve_description).toBe('Original description');
      expect(watcher.hasAppliedSuggestion.value).toBe(false);
    });

    it('treats navigation to another flaw as a new model, not a resync', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      const resyncCount = flawResyncCount.value;
      setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid-2', cve_description: 'Other flaw description' });
      await nextTick();

      expect(flawResyncCount.value).toBe(resyncCount);
      expect(flaw.value.cve_description).toBe('Other flaw description');
    });

    it('does not restore the suggestion after a direct flaw assignment (form reset)', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      const resyncCount = flawResyncCount.value;
      // FlawForm's onReset assigns flaw.value directly instead of calling setFlaw.
      flaw.value = { ...flaw.value, cve_description: 'Original description' };
      await nextTick();

      expect(flawResyncCount.value).toBe(resyncCount);
      expect(flaw.value.cve_description).toBe('Original description');
    });

    it('does not count a setFlaw call reusing the same model object as a resync', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      const resyncCount = flawResyncCount.value;
      setFlaw(flaw.value);
      await nextTick();

      expect(flawResyncCount.value).toBe(resyncCount);
      expect(flaw.value.cve_description).toBe('AI description');
    });

    it('restores again after a second resync still carrying the baseline value', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      setFlaw({ ...flaw.value, cve_description: 'Original description' });
      await nextTick();
      expect(flaw.value.cve_description).toBe('AI description');

      setFlaw({ ...flaw.value, cve_description: 'Original description' });
      await nextTick();
      expect(flaw.value.cve_description).toBe('AI description');
    });
  });

  describe('owning scope disposal', () => {
    it('ignores applies and reverts after the owning scope was disposed', () => {
      const watcher = mountWatcher();
      expect(watcher.applyAISuggestion('AI description')).toBe(true);
      app!.unmount();
      app = undefined;

      expect(watcher.applyAISuggestion('Another suggestion')).toBe(false);
      expect(flaw.value.cve_description).toBe('AI description');
      expect(metadataEntries().filter(entry => entry.type === 'AI')).toHaveLength(1);

      watcher.revertAISuggestion();
      expect(flaw.value.cve_description).toBe('AI description');
    });
  });
});
