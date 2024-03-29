import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { AnyObject, Maybe, ObjectSchema, ValidationError } from "yup";

type TProperty = "body" | "header" | "params" | "query";

type TGetSchema = <T extends Maybe<AnyObject>>(schema: ObjectSchema<T>) => ObjectSchema<T>;

type TAllSchemas = Record<TProperty, ObjectSchema<any>>;

type TGetAllSchemas = (getSchema: TGetSchema) => Partial<TAllSchemas>;//

type TValidation = (getAllSchema: TGetAllSchemas) => RequestHandler;


export const validation: TValidation = (getAllSchema) => async (req, res, next) => {
  const schemas = getAllSchema(schema => schema);

  const errorsResult: Record<string, Record<string, string>> = {};

  /*
  *Validates incoming requests [body, header, params, query]
  */
  Object.entries(schemas).forEach(([key, schema]) => {
    try {
      schema.validateSync(req[key as TProperty], { abortEarly: false });
    } catch (err) {
      const yupError = err as ValidationError;
      const errors: Record<string, string> = {};//Maps every received error and assigns to errors

      yupError.inner.forEach(error => {
        if (error.path === undefined) return;
        errors[error.path] = error.message;
      });
      errorsResult[key as TProperty] = errors;// Stores all errors from the validated schemas
    }
  });
  /*
  If the error array is empty (IE: no validation errors) ,execute next() operation
  *
  Otherwise returns errors to client
  */
  if (Object.entries(errorsResult).length === 0) {
    return next();
  } else {
    return res.status(StatusCodes.BAD_REQUEST).json({ errors: errorsResult });
  }
};
