import { Menu, TFile, TFolder, getLinkpath } from 'obsidian';
import Preact from 'preact/compat';

import { Path } from 'src/dnd/types';
import { t } from 'src/lang/helpers';
import { StateManager } from 'src/StateManager';

import { BoardModifiers } from '../../helpers/boardModifiers';
import { applyTemplate, escapeRegExpStr, generateInstanceId } from '../helpers';
import { Item } from '../types';
import {
  constructDatePicker,
  constructMenuDatePickerOnChange,
  constructMenuTimePickerOnChange,
  constructTimePicker,
} from './helpers';

const illegalCharsRegEx = /[\\/:"*?<>|]+/g;
const embedRegEx = /!?\[\[([^\]]*)\.[^\]]+\]\]/g;
const wikilinkRegEx = /!?\[\[([^\]]*)\]\]/g;
const mdLinkRegEx = /!?\[([^\]]*)\]\([^)]*\)/g;

interface UseItemMenuParams {
  setIsEditing: Preact.StateUpdater<boolean>;
  item: Item;
  path: Path;
  boardModifiers: BoardModifiers;
  stateManager: StateManager;
}

export function useItemMenu({
  setIsEditing,
  item,
  path,
  boardModifiers,
  stateManager,
}: UseItemMenuParams) {
  return Preact.useCallback(
    (e: MouseEvent, internalLinkPath?: string) => {
      if (internalLinkPath) {
        (app.workspace as any).onLinkContextMenu(
          e,
          getLinkpath(internalLinkPath),
          stateManager.file.path
        );
      } else {
        const coordinates = { x: e.clientX, y: e.clientY };
        const hasDate = !!item.data.metadata.date;
        const hasTime = !!item.data.metadata.time;

        const menu = new Menu().addItem((i) => {
          i.setIcon('lucide-edit')
            .setTitle(t('Edit card'))
            .onClick(() => setIsEditing(true));
        });

        menu
          .addItem((i) => {
            i.setIcon('lucide-file-plus-2')
              .setTitle(t('New note from card'))
              .onClick(async () => {
                const prevTitle = item.data.title.split('\n')[0].trim();
                const sanitizedTitle = prevTitle
                  .replace(embedRegEx, '$1')
                  .replace(wikilinkRegEx, '$1')
                  .replace(mdLinkRegEx, '$1')
                  .replace(illegalCharsRegEx, ' ')
                  .trim();

                const newNoteFolder =
                  stateManager.getSetting('new-note-folder');
                const newNoteTemplatePath =
                  stateManager.getSetting('new-note-template');

                const targetFolder = newNoteFolder
                  ? (stateManager.app.vault.getAbstractFileByPath(
                      newNoteFolder as string
                    ) as TFolder)
                  : stateManager.app.fileManager.getNewFileParent(
                      stateManager.file.path
                    );

                const newFile = (await (
                  stateManager.app.fileManager as any
                ).createNewMarkdownFile(targetFolder, sanitizedTitle)) as TFile;

                const newLeaf = stateManager.app.workspace.splitActiveLeaf();

                await newLeaf.openFile(newFile);

                stateManager.app.workspace.setActiveLeaf(newLeaf, false, true);

                await applyTemplate(
                  stateManager,
                  newNoteTemplatePath as string | undefined
                );

                const newTitleRaw = item.data.titleRaw.replace(
                  prevTitle,
                  stateManager.app.fileManager.generateMarkdownLink(
                    newFile,
                    stateManager.file.path
                  )
                );

                stateManager
                  .updateItemContent(item, newTitleRaw)
                  .then((item) => {
                    boardModifiers.updateItem(path, item);
                  })
                  .catch((e) => {
                    stateManager.setError(e);
                    console.error(e);
                  });
              });
          })
          .addItem((i) => {
            i.setIcon('lucide-link')
              .setTitle(t('Copy link to card'))
              .onClick(() => {
                if (item.data.blockId) {
                  navigator.clipboard.writeText(
                    `${this.app.fileManager.generateMarkdownLink(
                      stateManager.file,
                      '',
                      '#^' + item.data.blockId
                    )}`
                  );
                } else {
                  const id = generateInstanceId(6);

                  navigator.clipboard.writeText(
                    `${this.app.fileManager.generateMarkdownLink(
                      stateManager.file,
                      '',
                      '#^' + id
                    )}`
                  );

                  stateManager
                    .updateItemContent(item, `${item.data.titleRaw} ^${id}`)
                    .then((item) => {
                      boardModifiers.updateItem(path, item);
                    })
                    .catch((e) => {
                      stateManager.setError(e);
                      console.error(e);
                    });
                }
              });
          })
          .addSeparator();

        if (/\n/.test(item.data.titleRaw)) {
          menu.addItem((i) => {
            i.setIcon('lucide-wrap-text')
              .setTitle(t('Split card'))
              .onClick(async () => {
                const titles = item.data.titleRaw
                  .split(/[\r\n]+/g)
                  .map((t) => t.trim());
                const newItems = await Promise.all(
                  titles.map((title) => {
                    return stateManager.getNewItem(title);
                  })
                );

                boardModifiers.splitItem(path, newItems);
              });
          });
        }

        menu
          .addItem((i) => {
            i.setIcon('lucide-copy')
              .setTitle(t('Duplicate card'))
              .onClick(() => boardModifiers.duplicateEntity(path));
          })
          .addItem((i) => {
            i.setIcon('lucide-list-start')
              .setTitle(t('Insert card before'))
              .onClick(async () =>
                boardModifiers.insertItems(path, [
                  await stateManager.getNewItem('', false, true),
                ])
              );
          })
          .addItem((i) => {
            i.setIcon('lucide-list-end')
              .setTitle(t('Insert card after'))
              .onClick(async () => {
                const newPath = [...path];

                newPath[newPath.length - 1] = newPath[newPath.length - 1] + 1;

                boardModifiers.insertItems(newPath, [
                  await stateManager.getNewItem('', false, true),
                ]);
              });
          })
          .addItem((i) => {
            i.setIcon('lucide-arrow-up')
              .setTitle(t('Move to top'))
              .onClick(() => boardModifiers.moveItemToTop(path));
          })
          .addItem((i) => {
            i.setIcon('lucide-arrow-down')
              .setTitle(t('Move to bottom'))
              .onClick(() => boardModifiers.moveItemToBottom(path));
          })
          .addItem((i) => {
            i.setIcon('lucide-archive')
              .setTitle(t('Archive card'))
              .onClick(() => boardModifiers.archiveItem(path));
          })
          .addItem((i) => {
            i.setIcon('lucide-trash-2')
              .setTitle(t('Delete card'))
              .onClick(() => boardModifiers.deleteEntity(path));
          })
          .addSeparator()
          .addItem((i) => {
            i.setIcon('lucide-calendar-check')
              .setTitle(hasDate ? t('Edit date') : t('Add date'))
              .onClick(() => {
                constructDatePicker(
                  e.view,
                  stateManager,
                  coordinates,
                  constructMenuDatePickerOnChange({
                    stateManager,
                    boardModifiers,
                    item,
                    hasDate,
                    path,
                  }),
                  item.data.metadata.date?.toDate()
                );
              });
          });

        if (hasDate) {
          menu.addItem((i) => {
            i.setIcon('lucide-x')
              .setTitle(t('Remove date'))
              .onClick(() => {
                const shouldLinkDates = stateManager.getSetting(
                  'link-date-to-daily-note'
                );
                const dateTrigger = stateManager.getSetting('date-trigger');
                const contentMatch = shouldLinkDates
                  ? '(?:\\[[^\\]]+\\]\\([^\\)]+\\)|\\[\\[[^\\]]+\\]\\])'
                  : '{[^}]+}';
                const dateRegEx = new RegExp(
                  `(^|\\s)${escapeRegExpStr(
                    dateTrigger as string
                  )}${contentMatch}`
                );

                const titleRaw = item.data.titleRaw
                  .replace(dateRegEx, '')
                  .trim();

                stateManager
                  .updateItemContent(item, titleRaw)
                  .then((item) => {
                    boardModifiers.updateItem(path, item);
                  })
                  .catch((e) => {
                    stateManager.setError(e);
                    console.error(e);
                  });
              });
          });

          menu.addItem((i) => {
            i.setIcon('lucide-clock')
              .setTitle(hasTime ? t('Edit time') : t('Add time'))
              .onClick(() => {
                constructTimePicker(
                  e.view,
                  stateManager,
                  coordinates,
                  constructMenuTimePickerOnChange({
                    stateManager,
                    boardModifiers,
                    item,
                    hasTime,
                    path,
                  }),
                  item.data.metadata.time
                );
              });
          });

          if (hasTime) {
            menu.addItem((i) => {
              i.setIcon('lucide-x')
                .setTitle(t('Remove time'))
                .onClick(() => {
                  const timeTrigger = stateManager.getSetting('time-trigger');
                  const timeRegEx = new RegExp(
                    `(^|\\s)${escapeRegExpStr(timeTrigger as string)}{([^}]+)}`
                  );

                  const titleRaw = item.data.titleRaw
                    .replace(timeRegEx, '')
                    .trim();

                  stateManager
                    .updateItemContent(item, titleRaw)
                    .then((item) => {
                      boardModifiers.updateItem(path, item);
                    })
                    .catch((e) => {
                      stateManager.setError(e);
                      console.error(e);
                    });
                });
            });
          }
        }

        menu.showAtPosition(coordinates);
      }
    },
    [setIsEditing, item, path, boardModifiers, stateManager]
  );
}
