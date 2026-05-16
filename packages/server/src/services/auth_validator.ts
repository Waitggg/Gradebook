import { AuthRequestBody,  ValidationResult} from '../types/auth_types';

export function validateAuth(body : AuthRequestBody) : ValidationResult
{
    if(!body) return { success: false, error: 'Тело запроса пустое!!!!!!! БАН' };
    const { email, password } = body;
    if (!email || !password) {
      return { success: false, error: 'Email и пароль обязательны' };
    }
      return { success: true, error: null };
}