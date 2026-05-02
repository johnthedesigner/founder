declare global {
  namespace Express {
    interface Request {
      user?: { id: string; jti: string }
    }
  }
}

export {}
