export interface IRefreshToken {
    _id: string,
    refreshToken: string;
    ip: string;
    userAgent?: string;
    date: Date;
}