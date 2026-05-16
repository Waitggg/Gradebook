import path from 'path';
import fs from 'fs';

export function getId() : string
{
  const filePath = path.resolve(__dirname, '../db/users.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.users.length;
}