import { customErrorCode } from "../services/clientErrorService";

export interface ClientErrorInterface {
    code: customErrorCode,
    message: string,
    details?: string
}