import spec from './CloudFormationResourceSpecification.json';

export type PrimitiveType = string; //'Boolean' | 'Double' | 'Integer' | 'Json' | 'Long' | 'String' | 'Timestamp';
type UpdateType = string; // 'Immutable' | 'Mutable' | 'Conditional';
export type Type = string; // TODO better type
export type ResourceType = {
  Attributes?: {
    [attribute: string]: {
      PrimitiveType?: PrimitiveType
      Type?: Type,
      PrimitiveItemType?: PrimitiveType
      ItemType?: Type,
    }
  },
  Documentation: string,
  Properties: {
    [property: string]: {
      Documentation: string,
      Required: boolean,
      PrimitiveType?: PrimitiveType
      Type?: Type,
      PrimitiveItemType?: PrimitiveType
      ItemType?: Type,
      UpdateType: UpdateType
    }
  }
}
export type PropertyType = {
  Documentation: string,
  Properties: {
    [property: string]: {
      Documentation: string,
      Required: boolean,
      PrimitiveType?: PrimitiveType
      Type?: Type,
      PrimitiveItemType?: PrimitiveType
      ItemType?: Type,
      UpdateType: UpdateType
    }
  }
}
export const ResourceTypes: { [resourceType: string]: ResourceType } = spec.ResourceTypes;
export const PropertyTypes: { [propertyType: string]: PropertyType } = spec.PropertyTypes;
