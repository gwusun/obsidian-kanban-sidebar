import { App, TFile } from 'obsidian';

import { Board, FileMetadata, Item } from 'src/components/types';
import { t } from 'src/lang/helpers';
import { KanbanSettings } from 'src/Settings';
import { StateManager } from 'src/StateManager';

export const frontMatterKey = 'kanban-plugin';

export enum ParserFormats {
  List,
}

export interface BaseFormat {
  newItem(
    content: string,
    isComplete?: boolean,
    forceEdit?: boolean
  ): Promise<Item>;
  updateItemContent(item: Item, content: string): Promise<Item>;
  boardToMd(board: Board): string;
  mdToBoard(md: string): Promise<Board>;
  reparseBoard(): Promise<Board>;
}

export const completeString = `**${t('Complete')}**`;
export const archiveString = '***';
export const basicFrontmatter = [
  '---',
  '',
  `${frontMatterKey}: basic`,
  '',
  '---',
  '',
  '',
].join('\n');

export function settingsToCodeblock(settings: KanbanSettings): string {
  return [
    '',
    '',
    '%% kanban:settings',
    '```',
    JSON.stringify(settings),
    '```',
    '%%',
  ].join('\n');
}

export function getSearchValue(
  dom: HTMLDivElement,
  tags?: string[],
  fileMetadata?: FileMetadata
) {
  let searchValue = dom.innerText.trim();

  if (tags?.length) {
    searchValue += ' ' + tags.join(' ');
  }

  if (fileMetadata) {
    const keys = Object.keys(fileMetadata).join(' ');
    const values = Object.values(fileMetadata)
      .map((v) => {
        if (Array.isArray(v.value)) {
          return v.value.join(' ');
        }

        return v.value.toString();
      })
      .join(' ');

    searchValue += ' ' + keys + ' ' + values;
  }

  return searchValue.toLocaleLowerCase();
}

export function getDataViewCache(
  app: App,
  linkedFile: TFile,
  sourceFile: TFile
) {
  if (
    (app as any).plugins.enabledPlugins.has('dataview') &&
    (app as any).plugins?.plugins?.dataview?.api
  ) {
    return (app as any).plugins.plugins.dataview.api.page(
      linkedFile.path,
      sourceFile.path
    );
  }
}

function getPageData(obj: any, path: string) {
  if (!obj) return null;
  if (obj[path]) return obj[path];

  const split = path.split('.');
  let ctx = obj;

  for (const p of split) {
    if (typeof ctx === 'object' && p in ctx) {
      ctx = ctx[p];
    } else {
      ctx = null;
      break;
    }
  }

  return ctx;
}

export function getLinkedPageMetadata(
  stateManager: StateManager,
  linkedFile: TFile | null | undefined
): { fileMetadata?: FileMetadata; fileMetadataOrder?: string[] } {
  const metaKeys = stateManager.getSetting('metadata-keys');

  if (!metaKeys.length) {
    return {};
  }

  if (!linkedFile) {
    return {};
  }

  const cache = stateManager.app.metadataCache.getFileCache(linkedFile);
  const dataviewCache = getDataViewCache(
    stateManager.app,
    linkedFile,
    stateManager.file
  );

  if (!cache && !dataviewCache) {
    return {};
  }

  const metadata: FileMetadata = {};
  const seenTags: { [k: string]: boolean } = {};
  const seenKey: { [k: string]: boolean } = {};
  const order: string[] = [];

  let haveData = false;

  metaKeys.forEach((k) => {
    if (seenKey[k.metadataKey]) return;

    seenKey[k.metadataKey] = true;

    if (k.metadataKey === 'tags') {
      let tags = cache?.tags || [];

      if (Array.isArray(cache?.frontmatter?.tags)) {
        tags = [].concat(
          tags,
          cache.frontmatter.tags.map((tag: string) => ({ tag: `#${tag}` }))
        );
      }

      if (tags?.length === 0) return;

      order.push(k.metadataKey);
      metadata.tags = {
        ...k,
        value: tags
          .map((t) => t.tag)
          .filter((t) => {
            if (seenTags[t]) {
              return false;
            }

            seenTags[t] = true;
            return true;
          }),
      };

      haveData = true;
      return;
    }

    const cacheVal = getPageData(cache?.frontmatter, k.metadataKey);
    const dataviewVal = getPageData(dataviewCache, k.metadataKey);

    if (cacheVal) {
      order.push(k.metadataKey);
      metadata[k.metadataKey] = {
        ...k,
        value: cacheVal,
      };
      haveData = true;
    } else if (dataviewVal) {
      const cachedValue = dataviewCache[k.metadataKey];
      let val = cachedValue.values || cachedValue.val || cachedValue;

      // Protect against proxy values
      if (val === cachedValue && typeof val === 'object') {
        val = { ...cachedValue };
      } else if (
        !Array.isArray(val) &&
        typeof val !== 'string' &&
        typeof val !== 'number'
      ) {
        return;
      }

      order.push(k.metadataKey);
      metadata[k.metadataKey] = {
        ...k,
        value: val,
      };
      haveData = true;
    }
  });

  return {
    fileMetadata: haveData ? metadata : undefined,
    fileMetadataOrder: order,
  };
}

export function shouldRefreshBoard(
  oldSettings: KanbanSettings,
  newSettings: KanbanSettings
) {
  if (!oldSettings && newSettings) {
    return true;
  }

  const toCompare: Array<keyof KanbanSettings> = [
    'metadata-keys',
    'date-trigger',
    'time-trigger',
    'link-date-to-daily-note',
    'date-format',
    'time-format',
    'hide-date-in-title',
    'hide-tags-in-title',
    'hide-card-count',
    'tag-colors',
    'date-colors',
  ];

  return !toCompare.every((k) => {
    return oldSettings[k] === newSettings[k];
  });
}
