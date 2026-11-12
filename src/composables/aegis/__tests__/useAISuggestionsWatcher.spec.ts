import type { App } from 'vue';
import { computed, nextTick } from 'vue';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { blankFlaw, useFlaw } from '@/composables/useFlaw';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import { withSetup } from '@/__tests__/helpers';
import { deepCopyFromRaw } from '@/utils/helpers';

import { useAISuggestionsWatcher } from '../useAISuggestionsWatcher';

type Watcher = ReturnType<typeof useAISuggestionsWatcher>;

describe('useAISuggestionsWatcher', () => {
  let app: App | undefined;
  const { acceptServerFlaw, flaw, flawResyncCount, isFlawUpdated, resetFlaw, setFlaw } = useFlaw();
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
      // The restore is not a user modification: exactly one entry, no 'Partial AI'.
      expect(metadataEntries()).toHaveLength(1);
      expect(metadataEntries()[0]).toMatchObject({ type: 'AI', value: 'AI description' });
    });

    it('keeps the server value when the resync changed the field on the server', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      setFlaw({ ...flaw.value, cve_description: 'Edited on the server' });
      await nextTick();

      expect(flaw.value.cve_description).toBe('Edited on the server');
      // A server-side change during an applied suggestion is not a user edit.
      expect(metadataEntries()).toHaveLength(1);
      expect(metadataEntries()[0]).toMatchObject({ type: 'AI', value: 'AI description' });
    });

    it('does not resurrect a suggestion over a field the user modified since it was applied', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      // The user edits the applied suggestion: an ordinary value change, no resync.
      flaw.value.cve_description = 'AI description (user edited)';
      await nextTick();
      expect(watcher.hasPartialModification.value).toBe(true);

      // A same-flaw resync brings the pre-suggestion value back from the server.
      setFlaw({ ...flaw.value, cve_description: 'Original description' });
      await nextTick();

      expect(flaw.value.cve_description).toBe('Original description');
      expect(watcher.hasAppliedSuggestion.value).toBe(true);
      // The user's modification is still the only partial change on record.
      const partialEntries = metadataEntries().filter(entry => entry.type === 'Partial AI');
      expect(partialEntries).toHaveLength(1);
      expect(partialEntries[0].value).toBe('AI description (user edited)');
    });

    it('tracks partial modifications made after a resync restore', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      setFlaw({ ...flaw.value, cve_description: 'Original description' });
      await nextTick();
      expect(flaw.value.cve_description).toBe('AI description');

      // The user edits the restored suggestion; the resync skip must not be sticky.
      flaw.value.cve_description = 'AI description (user edited)';
      await nextTick();

      expect(watcher.hasPartialModification.value).toBe(true);
      const partialEntries = metadataEntries().filter(entry => entry.type === 'Partial AI');
      expect(partialEntries).toHaveLength(1);
      expect(partialEntries[0].value).toBe('AI description (user edited)');
    });

    it('tracks the user edit following a resync that left the applied value unchanged', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      // A post-save sync replaces the model with a new object echoing the saved
      // suggestion: the resync counter bumps but the field value is unchanged.
      const resyncCount = flawResyncCount.value;
      setFlaw({ ...flaw.value, cve_description: 'AI description' });
      await nextTick();

      expect(flawResyncCount.value).toBe(resyncCount + 1);
      expect(flaw.value.cve_description).toBe('AI description');
      expect(watcher.hasPartialModification.value).toBe(false);

      // The user then edits the value: an ordinary change, no resync involved.
      flaw.value.cve_description = 'AI description (user edited)';
      await nextTick();

      expect(watcher.hasPartialModification.value).toBe(true);
      const entries = metadataEntries();
      expect(entries).toHaveLength(2);
      expect(entries.filter(entry => entry.type === 'AI')).toHaveLength(1);
      const partialEntries = entries.filter(entry => entry.type === 'Partial AI');
      expect(partialEntries).toHaveLength(1);
      expect(partialEntries[0].value).toBe('AI description (user edited)');
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

  // confirmCollisionDialog applies the saved flaw with acceptServerFlaw instead
  // of setFlaw: adopting server values is a model resync all the same, and the
  // fields the user resolved with the server value retire their suggestions.
  describe('server flaw adoption (acceptServerFlaw)', () => {
    it('retires the suggestion when the user kept the server value for its field', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      // The collision dialog offered the description and the user chose the
      // server side, so the saved flaw carries a value the server changed.
      const resyncCount = flawResyncCount.value;
      acceptServerFlaw(
        { ...deepCopyFromRaw(flaw.value), cve_description: 'Server description' },
        ['cve_description'],
      );
      await nextTick();

      expect(flawResyncCount.value).toBe(resyncCount + 1);
      expect(flaw.value.cve_description).toBe('Server description');
      // The adoption is a resync, not a user edit: no 'Partial AI' is recorded
      // and the overruled suggestion is retired with its metadata removed.
      expect(watcher.hasAppliedSuggestion.value).toBe(false);
      expect(watcher.hasPartialModification.value).toBe(false);
      expect(metadataEntries()).toHaveLength(0);
    });

    it('does not restore a suggestion over a server choice matching the pre-suggestion edit', async () => {
      const watcher = mountWatcher();
      // The user edited the description, then applied a suggestion on top.
      flaw.value.cve_description = 'User edited description';
      watcher.applyAISuggestion('AI description');
      await nextTick();

      // The server changed the description to the very value the user typed
      // before the suggestion was applied, and the user kept the server side.
      acceptServerFlaw(
        { ...deepCopyFromRaw(flaw.value), cve_description: 'User edited description' },
        ['cve_description'],
      );
      await nextTick();

      expect(flaw.value.cve_description).toBe('User edited description');
      expect(watcher.hasAppliedSuggestion.value).toBe(false);
      expect(metadataEntries()).toHaveLength(0);
      // No restore re-dirtied the form against the adopted server value.
      expect(isFlawUpdated.value).toBe(false);
    });

    it('keeps the suggestion when the adoption echoes it back', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      // The user chose 'mine' for the description and 'server' for another
      // field: the saved flaw still carries the suggestion.
      const resyncCount = flawResyncCount.value;
      acceptServerFlaw(
        { ...deepCopyFromRaw(flaw.value), cve_description: 'AI description' },
        ['title'],
      );
      await nextTick();

      expect(flawResyncCount.value).toBe(resyncCount + 1);
      expect(flaw.value.cve_description).toBe('AI description');
      expect(watcher.hasAppliedSuggestion.value).toBe(true);
      expect(watcher.hasPartialModification.value).toBe(false);
      expect(metadataEntries()).toHaveLength(1);
      expect(metadataEntries()[0]).toMatchObject({ type: 'AI', value: 'AI description' });
    });

    it('tracks a user edit made after an adoption that left the value unchanged', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      // The adoption echoed the suggestion: the resync must still consume the
      // counter, or the next user edit would be misattributed to it.
      acceptServerFlaw({ ...deepCopyFromRaw(flaw.value), cve_description: 'AI description' });
      await nextTick();
      expect(watcher.hasPartialModification.value).toBe(false);

      flaw.value.cve_description = 'AI description (user edited)';
      await nextTick();

      expect(watcher.hasPartialModification.value).toBe(true);
      const partialEntries = metadataEntries().filter(entry => entry.type === 'Partial AI');
      expect(partialEntries).toHaveLength(1);
      expect(partialEntries[0].value).toBe('AI description (user edited)');
    });

    it('still restores a suggestion wiped by a later resync after an adoption', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      acceptServerFlaw({ ...deepCopyFromRaw(flaw.value), cve_description: 'AI description' });
      await nextTick();
      expect(flaw.value.cve_description).toBe('AI description');

      // A later post-save sync or refetch replaces the model with the
      // pre-suggestion value: the original restore behavior still applies.
      setFlaw({ ...flaw.value, cve_description: 'Original description' });
      await nextTick();

      expect(flaw.value.cve_description).toBe('AI description');
      expect(watcher.hasAppliedSuggestion.value).toBe(true);
      expect(isFlawUpdated.value).toBe(true);
      expect(metadataEntries()).toHaveLength(1);
    });

    it('restores a new suggestion after a later resync clears the server-chosen fields', async () => {
      const watcher = mountWatcher();
      watcher.applyAISuggestion('AI description');
      await nextTick();

      // The user resolved a collision by keeping the server description.
      acceptServerFlaw(
        { ...deepCopyFromRaw(flaw.value), cve_description: 'Server description' },
        ['cve_description'],
      );
      await nextTick();
      expect(watcher.hasAppliedSuggestion.value).toBe(false);

      // A new suggestion applied on top of the adopted value...
      watcher.applyAISuggestion('Second AI description');
      await nextTick();
      expect(watcher.hasAppliedSuggestion.value).toBe(true);

      // ...must still be restored when a later resync wipes it back to the
      // adopted value: the server-chosen state lives for one resync only.
      setFlaw({ ...flaw.value, cve_description: 'Server description' });
      await nextTick();

      expect(flaw.value.cve_description).toBe('Second AI description');
      expect(watcher.hasAppliedSuggestion.value).toBe(true);
      expect(isFlawUpdated.value).toBe(true);
      expect(metadataEntries()).toHaveLength(1);
      expect(metadataEntries()[0]).toMatchObject({ type: 'AI', value: 'Second AI description' });
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
