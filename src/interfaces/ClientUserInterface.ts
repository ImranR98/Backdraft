import { ClientRefreshTokenInterface } from "./ClientRefreshTokenInterface";

export interface ClientUserInterface {
    _id: number;
    email: string;
    password: string;
    verified: boolean;
    refreshTokens: ClientRefreshTokenInterface[];
}