export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email обязателен' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Неверный формат email' };
  }
  
  return { isValid: true };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: true };
  }
  
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  const phoneRegex = /^(\+7|8)?[0-9]{10}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Формат: +7 XXX XXX XXXX' };
  }
  
  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Пароль обязателен' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Минимум 8 символов' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Нужна заглавная буква' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Нужна строчная буква' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Нужна цифра' };
  }
  
  return { isValid: true };
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 2) {
    return { score, label: 'Слабый', color: '#FF6B6B' };
  } else if (score <= 4) {
    return { score, label: 'Средний', color: '#FFB74D' };
  } else {
    return { score, label: 'Сильный', color: '#4CAF7A' };
  }
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('7') || digits.startsWith('8')) {
    const cleaned = digits.slice(1);
    if (cleaned.length <= 3) {
      return `+7 ${cleaned}`;
    } else if (cleaned.length <= 6) {
      return `+7 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 8) {
      return `+7 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    } else {
      return `+7 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
    }
  }
  
  if (digits.length <= 3) {
    return `+7 ${digits}`;
  } else if (digits.length <= 6) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  } else if (digits.length <= 8) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  } else {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
}
