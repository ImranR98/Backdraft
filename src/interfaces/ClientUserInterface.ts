import { ClientRefreshTokenInterface } from "./ClientRefreshTokenInterface";

export interface ClientUserInterface {
    id: number;
    email: string;
    refreshTokens: ClientRefreshTokenInterface[];
}