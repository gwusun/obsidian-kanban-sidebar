import update from 'immutability-helper';
import Preact from 'preact/compat';

import { Path } from 'src/dnd/types';
import { StateManager } from 'src/StateManager';

import { BoardModifiers } from '../../helpers/boardModifiers';
import {c, getCurrentDatetime, getTaskFinishedReg} from '../helpers';
import { Icon } from '../Icon/Icon';
import { Item } from '../types';

interface ItemCheckboxProps {
  path: Path;
  item: Item;
  shouldMarkItemsComplete: boolean;
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
}

export const ItemCheckbox = Preact.memo(function ItemCheckbox({
  shouldMarkItemsComplete,
  path,
  item,
  stateManager,
  boardModifiers,
}: ItemCheckboxProps) {
  const shouldShowCheckbox = stateManager.useSetting('show-checkboxes');

  const [isCtrlHoveringCheckbox, setIsCtrlHoveringCheckbox] =
    Preact.useState(false);
  const [isHoveringCheckbox, setIsHoveringCheckbox] = Preact.useState(false);

  Preact.useEffect(() => {
    if (isHoveringCheckbox) {
      const handler = (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
          setIsCtrlHoveringCheckbox(true);
        } else {
          setIsCtrlHoveringCheckbox(false);
        }
      };

      window.addEventListener('keydown', handler);
      window.addEventListener('keyup', handler);

      return () => {
        window.removeEventListener('keydown', handler);
        window.removeEventListener('keyup', handler);
      };
    }
  }, [isHoveringCheckbox]);

  if (!(shouldMarkItemsComplete || shouldShowCheckbox)) {
    return null;
  }

  return (
    <div
      onMouseEnter={(e) => {
        setIsHoveringCheckbox(true);

        if (e.ctrlKey || e.metaKey) {
          setIsCtrlHoveringCheckbox(true);
        }
      }}
      onMouseLeave={() => {
        setIsHoveringCheckbox(false);

        if (isCtrlHoveringCheckbox) {
          setIsCtrlHoveringCheckbox(false);
        }
      }}
      className={c('item-prefix-button-wrapper')}
    >
      {shouldShowCheckbox && !isCtrlHoveringCheckbox && (
        <input
          onChange={() => {
            //Automatically the task finished datetime to the task, e.g. task name ✅ 2022-11-6 13:20
            const finished_value=" ✅ " + getCurrentDatetime()
            const reg_finished_datetime=  getTaskFinishedReg()
            const task_raw_content=item.data.titleRaw
            let target_task_value=""
            if(item.data.isComplete===false){
                if(task_raw_content.search(reg_finished_datetime) === -1){
                //not existed the finished datatime
                target_task_value=task_raw_content+" "+finished_value
                }else{
                    //the finished datatime is existed
                    target_task_value=task_raw_content.replaceAll(reg_finished_datetime,finished_value)
                }
            }else{
                //unfinished the task, remove the finished datatime
                target_task_value=task_raw_content.replaceAll(reg_finished_datetime,"")
            }

            console.log("==================== source item ================================")
            console.log(item);
            // boardModifiers.updateItem(
            //   path,
            //   update(item, {
            //     data: {
            //       $toggle: ['isComplete'],
            //       titleRaw:{
            //         $set: target_task_value
            //       }
            //     },
            //   })
            // );

            stateManager.updateItemContent(item,target_task_value).then(item=>{
              //update the task value on the panel
              console.log("update successful")
              boardModifiers.updateItem(path,update(item, {
                data: {
                  $toggle: ['isComplete']
                },
              }))
            }).catch(e=>{
              stateManager.setError(e)
              console.error(e)
            })
          }}

          // end
          type="checkbox"
          className="task-list-item-checkbox"
          checked={!!item.data.isComplete}
        />
      )}
      {(isCtrlHoveringCheckbox ||
        (!shouldShowCheckbox && shouldMarkItemsComplete)) && (
        <a
          onClick={() => {
            boardModifiers.archiveItem(path);
          }}
          className={`${c('item-prefix-button')} clickable-icon`}
          aria-label={isCtrlHoveringCheckbox ? undefined : 'Archive card'}
        >
          <Icon name="sheets-in-box" />
        </a>
      )}
    </div>
  );
});
