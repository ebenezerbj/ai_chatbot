export const authenticateAdmin = (req: any, res: any, next: any): void => {
  const authHeader = (req && req.headers && (req.headers.authorization || req.headers.Authorization))
    || (req && typeof req.get === 'function' && req.get('authorization'))
    || (req && typeof req.header === 'function' && req.header('authorization'))
    || undefined;

  if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.toString().split(' ')[1];

  if (token !== process.env.ADMIN_TOKEN) {
    res.status(403).json({ error: 'Invalid admin token' });
    return;
  }

  next();
};
