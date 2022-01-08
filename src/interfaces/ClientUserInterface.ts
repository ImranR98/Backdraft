import { ClientRefreshTokenInterface } from "./ClientRefreshTokenInterface";

export interface ClientUserInterface {
    id: number;
    email: string;
    verified: boolean;
    refreshTokens: ClientRefreshTokenInterface[];
}