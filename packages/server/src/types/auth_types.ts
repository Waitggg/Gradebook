import { getId } from '../services/userId_getter.js';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: 'teacher' | 'student';
    isLoggedIn: boolean;
  }
}

export type Role = 'teacher' | 'student';

export interface AuthRequestBody {
  email: string;
  password: string;
}

export interface AuthResponseBody {
  status: number;
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: Role;
    creationDate?: Date;
  };
}

export interface ValidationResult {
  success: boolean;
  error: string | null;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface LoginUserDTO {
  email: string;
  password: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  creationDate: Date;
}

export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  creationDate: Date;
  role: Role;
}

export class User implements IUser {
  constructor(
    private _id: string,
    private _email: string,
    private _password: string,
    private _name: string,
    private _creationDate: Date,
    private _role: Role
  ) {}

  static async createNew(
    email: string, 
    password: string, 
    name: string,
    role: Role = 'student'
  ): Promise<User> {
    return new User(
      getId(),
      email,
      password,
      name,
      new Date(),
      role
    );
  }

  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get password(): string {
    return this._password;
  }

  get name(): string {
    return this._name;
  }

  get creationDate(): Date {
    return this._creationDate;
  }

  get role(): Role {
    return this._role;
  }

  isTeacher(): boolean {
    return this._role === 'teacher';
  }

  isStudent(): boolean {
    return this._role === 'student';
  }

  toJSON(): UserResponseDTO {
    return {
      id: this._id,
      email: this._email,
      name: this._name,
      role: this._role,
      creationDate: this._creationDate
    };
  }
}