import merge from 'deepmerge';
import update, { Spec } from 'immutability-helper';
import { isPlainObject } from 'is-plain-object';

import { Nestable, Path } from '../types';
import { SiblingDirection, getSiblingDirection } from './path';

export function getEntityFromPath(root: Nestable, path: Path): Nestable {
  const step = path.length ? path[0] : null;

  if (step !== null && root.children && root.children[step]) {
    return getEntityFromPath(root.children[step], path.slice(1));
  }

  return root;
}

export function buildUpdateMutation(path: Path, mutation: Spec<Nestable>) {
  let pathedMutation: Spec<Nestable> = mutation;

  for (let i = path.length - 1; i >= 0; i--) {
    pathedMutation = {
      children: {
        [path[i]]: pathedMutation,
      },
    };
  }

  return pathedMutation;
}

export function buildUpdateParentMutation(
  path: Path,
  mutation: Spec<Nestable>
) {
  let pathedMutation: Spec<Nestable> = mutation;

  for (let i = path.length - 2; i >= 0; i--) {
    pathedMutation = {
      children: {
        [path[i]]: pathedMutation,
      },
    };
  }

  return pathedMutation;
}

export function buildRemoveMutation(path: Path) {
  return buildUpdateParentMutation(path, {
    children: {
      $splice: [[path[path.length - 1], 1]],
    },
  });
}

export function buildInsertMutation(
  destination: Path,
  entities: Nestable[],
  destinationModifier: number = 0
) {
  return buildUpdateParentMutation(destination, {
    children: {
      $splice: [
        [
          destination[destination.length - 1] + destinationModifier,
          0,
          ...entities,
        ],
      ],
    },
  });
}

export function buildAppendMutation(destination: Path, entities: Nestable[]) {
  return buildUpdateParentMutation(destination, {
    children: {
      $push: entities,
    },
  });
}

export function buildPrependMutation(destination: Path, entities: Nestable[]) {
  return buildUpdateParentMutation(destination, {
    children: {
      $unshift: entities,
    },
  });
}

export function moveEntity(
  root: Nestable,
  source: Path,
  destination: Path,
  transform?: (entity: Nestable) => Nestable
) {
  const entity = transform
    ? transform(getEntityFromPath(root, source))
    : getEntityFromPath(root, source);
  const siblingDirection = getSiblingDirection(source, destination);

  const destinationModifier =
    siblingDirection === SiblingDirection.After ? -1 : 0;

  const removeMutation = buildRemoveMutation(source);
  const insertMutation = buildInsertMutation(
    destination,
    [entity],
    destinationModifier
  );

  const mutation = merge<Spec<Nestable>>(removeMutation, insertMutation, {
    isMergeableObject: (val) => {
      return isPlainObject(val) || Array.isArray(val);
    },
  });

  const newBoard = update(root, mutation);

  return newBoard;
}

export function removeEntity(root: Nestable, target: Path) {
  return update(root, buildRemoveMutation(target));
}

export function insertEntity(
  root: Nestable,
  destination: Path,
  entities: Nestable[]
) {
  return update(root, buildInsertMutation(destination, entities));
}

export function appendEntities(
  root: Nestable,
  destination: Path,
  entities: Nestable[]
) {
  return update(root, buildAppendMutation(destination, entities));
}

export function prependEntities(
  root: Nestable,
  destination: Path,
  entities: Nestable[]
) {
  return update(root, buildPrependMutation(destination, entities));
}

export function updateEntity(
  root: Nestable,
  path: Path,
  mutation: Spec<Nestable>
) {
  return update(root, buildUpdateMutation(path, mutation));
}

export function updateParentEntity(
  root: Nestable,
  path: Path,
  mutation: Spec<Nestable>
) {
  return update(root, buildUpdateParentMutation(path, mutation));
}
