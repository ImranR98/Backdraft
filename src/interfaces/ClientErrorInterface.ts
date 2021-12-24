import { customErrorCode } from "../helpers/clientErrorHelper";

export interface ClientErrorInterface {
    code: customErrorCode,
    message?: string
}