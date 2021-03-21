/**
 * sequalie validation hook that adds 'noUpdate' attribute to model
 * the hook throws if a field that has the 'noUpdate' attribute is updated
 * code adapted from https://github.com/diosney/node-sequelize-noupdate-attributes
 * */

import { Sequelize, Model, ValidationError, ValidationErrorItem, ModelAttributeColumnOptions } from "sequelize";
import { IDictionary, POJO } from "../utils";

export type ModelAttributeColumnOptions2
  = ModelAttributeColumnOptions<Model> & { noUpdate: boolean & { readOnly: boolean } };

type Model2 = Model & {
  id?: number;
  _previousDataValues?: POJO;
  associate?: () => void;
  rawAttributes: IDictionary<ModelAttributeColumnOptions2>;
};

async function beforeValidate(instance: Model2, _options: unknown) {

  const changedKeys = instance.changed();
  if (!changedKeys || instance.isNewRecord) {
    return;
  }

  changedKeys.forEach((fieldName) => {
    const fieldDefinition = instance.rawAttributes[fieldName];
    if (!fieldDefinition.noUpdate) {
      return;
    }

    // noUpdate.readonly >> must not update at all
    // noUpdate >> can still change if there was no value before
    if (fieldDefinition.noUpdate?.readOnly
      || (instance._previousDataValues[fieldName] !== undefined
        && instance._previousDataValues[fieldName] !== null)) {    // eslint-disable-line
      throw new ValidationError("ValidationError", [new ValidationErrorItem(`'${fieldName}' updated on 'noUpdate' constraint`, "noUpdate Violation", fieldName)]);
    }
  });
}

export const addNoUpdateHook = (sequelize: Sequelize) => sequelize.addHook("beforeValidate", beforeValidate);

