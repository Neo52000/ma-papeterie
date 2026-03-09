export interface JwtPayloadRequest {
  user: { sub: string; email: string; role: string };
}
