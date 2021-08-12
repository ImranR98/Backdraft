import { IRefreshToken } from "./IRefreshToken";

export interface IUser {
    _id: number;
    email: string;
    password: string;
    verified: boolean;
    refreshTokens: IRefreshToken[];
}