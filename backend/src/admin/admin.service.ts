import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin, Lockout } from './entities';
import * as content from '../content';
import { EditAdminDto, RegisterAdminDto } from './dto';
import { AdminUserViewModel } from './vm/admin.vm';

/**
 * A service designed to deal with Admin actions.
 */
@Injectable()
export class AdminService {
  /**
   * @param adminRepo - The admin repository.
   */
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Lockout)
    private readonly lockoutRepo: Repository<Lockout>,
  ) {}

  /**
   * @returns AdminUserViewModel[] - a List of all admins in ViewModel form.
   */
  async listAllAdmins(): Promise<AdminUserViewModel[]> {
    return (await this.adminRepo.find()).map((e) => new AdminUserViewModel(e));
  }

  /**
   * @param id - the id of the admin.
   * @returns Promise<Admin> - the Admin entity being searched for.
   */
  async getAdmin(id: string): Promise<Admin> {
    return await this.adminRepo.findOneBy({ id });
  }

  /**
   * @param email - the email of the admin.
   * @returns Promise<Admin> - the Admin entity being searched for.
   */
  async getAdminByEmail(email: string): Promise<Admin | null> {
    return await this.adminRepo.findOneBy({ email });
  }

  /**
   * @param details - the Admin data to add.
   */
  async createAdmin(details: Admin) {
    await this.adminRepo.save(details);
  }

  /**
   * @param registrationData - the details to register.
   * @returns Promise<string> - a success message.
   */
  async registerAdmin(registrationData: RegisterAdminDto): Promise<string> {
    const userExists = await this.getAdminByEmail(registrationData.email);
    if (userExists) {
      throw new ConflictException(content.AdminAlreadyExists);
    }
    const admin = {
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      email: registrationData.email,
      password: null,
      isSuperUser: registrationData.isSuperUser,
      mainYouthClub: registrationData.mainYouthClub,
    } as Admin;
    await this.createAdmin(admin);
    return content.Created(registrationData.email);
  }

  /**
   * @param details the details to change, including the ID of the user in question.
   * @return Promise<string>  a success message.
   */
  async editAdmin(details: EditAdminDto): Promise<string> {
    const user = await this.adminRepo.findOneBy({ id: details.id });
    if (!user) {
      throw new BadRequestException(content.UserNotFound);
    }
    if (user.email !== details.email.toLowerCase()) {
      const emailInUse = await this.getAdminByEmail(details.email);
      if (emailInUse) {
        throw new ConflictException(content.AdminAlreadyExists);
      }
    }
    user.email = details.email;
    user.firstName = details.firstName;
    user.lastName = details.lastName;
    user.isSuperUser = details.isSuperUser;
    user.mainYouthClub = details.mainYouthClub;
    await this.adminRepo.save(user);
    return `${details.email} ${content.Updated}`;
  }

  /**
   * This method deletes the provided admin.
   * @param id the id of the user to delete.
   */
  async deleteAdmin(id: string) {
    const admin = await this.getAdmin(id);
    if (!admin) {
      throw new BadRequestException(content.UserNotFound);
    }
    await this.adminRepo.remove(admin);
    return `${id} ${content.Deleted}`;
  }

  /**
   * @summary This function is called after succesful ad login
   * @param registrationData - the details to register.
   * @returns Promise<string> - a success message.
   */
  async upsertAdmin(loginData: {
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const user = await this.getAdminByEmail(loginData.email);
    // Save functions like upser
    return await this.adminRepo.save({ ...user, ...loginData });
  }

  async setMainYouthClub(clubId: string, userId: string): Promise<boolean> {
    const admin = await this.getAdmin(userId);
    if (!admin) {
      throw new BadRequestException(content.UserNotFound);
    }
    admin.mainYouthClub = clubId;
    await this.adminRepo.save(admin);
    return true;
  }
}
