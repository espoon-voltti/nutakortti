import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../admin/admin.service';
import { DataSource } from 'typeorm';
import { Admin, Lockout } from '../admin/entities';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '../../test/Mock';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AuthenticationService } from '../authentication/authentication.service';
import { JwtModule } from '@nestjs/jwt';
import { jwt } from '../authentication/authentication.consts';
import { JwtStrategy } from '../authentication/jwt.strategy';
import { getTestDB } from '../../test/testdb';
import { AdminModule } from '../admin/admin.module';
import { AppModule } from '../app.module';
import { RegisterAdminDto, LoginAdminDto } from '../admin/dto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JuniorService } from '../junior/junior.service';
import { JuniorModule } from '../junior/junior.module';
import { RegisterJuniorDto, LoginJuniorDto } from '../junior/dto';
import { Challenge, Junior } from '../junior/entities';
import { SmsModule } from '../sms/sms.module';
import { HttpModule } from '@nestjs/axios';

describe('AuthenticationService', () => {
  let module: TestingModule;
  let connection: DataSource;
  let service: AuthenticationService;
  let adminService: AdminService;
  let juniorService: JuniorService;

  const testRegisterAdmin = {
    email: 'Authentication@service.test',
    firstName: 'Auth',
    lastName: 'Tication',
    password: 'Hush',
    isSuperUser: true,
  } as RegisterAdminDto;
  const testLoginAdmin = {
    email: testRegisterAdmin.email,
    password: testRegisterAdmin.password,
  } as LoginAdminDto;
  const testRegisterJunior = {
    phoneNumber: '04122345618',
    firstName: 'Auth jr',
    lastName: 'Senior',
    postCode: '02130',
    parentsName: 'Auth Senior',
    parentsPhoneNumber: '0411234567',
    gender: 'M',
    birthday: new Date().toISOString(),
    homeYouthClub: 'Tikkurila',
    status: 'accepted',
    photoPermission: false,
  } as RegisterJuniorDto;
  let testLoginJunior: LoginJuniorDto;

  beforeAll(async () => {
    connection = await getTestDB();
    module = await Test.createTestingModule({
      imports: [
        AuthenticationModule,
        AdminModule,
        AppModule,
        JuniorModule,
        SmsModule,
        HttpModule,
        JwtModule.register({
          secret: jwt.secret,
        }),
      ],
      providers: [
        AdminService,
        AuthenticationService,
        JuniorService,
        {
          provide: getRepositoryToken(Admin),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(Junior),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(Challenge),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(Lockout),
          useFactory: repositoryMockFactory,
        },
        JwtStrategy,
      ],
    })
      .overrideProvider(DataSource)
      .useValue(connection)
      .compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    adminService = module.get<AdminService>(AdminService);
    juniorService = module.get<JuniorService>(JuniorService);

    await adminService.registerAdmin(testRegisterAdmin);
    // noSMS: the test environment has no SMS gateway. resetLogin creates the
    // login challenge before it fails on the missing gateway.
    await juniorService.registerJunior(testRegisterJunior, true);
    await juniorService
      .resetLogin('358' + testRegisterJunior.phoneNumber.slice(1))
      .catch(() => undefined);
    const juniorChallenge = await juniorService.getChallengeByPhoneNumber(
      testRegisterJunior.phoneNumber,
    );
    testLoginJunior = {
      id: juniorChallenge.id,
      challenge: juniorChallenge.challenge,
    };
  });

  afterAll(async () => {
    await module.close();
    // module.close() already destroys the DataSource it was given via
    // overrideProvider, so only destroy it here if that did not happen.
    if (connection.isInitialized) {
      await connection.destroy();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Login admin', () => {
    it('should return a access token token if login is succseful', async () => {
      expect(
        (await service.loginAdmin(testLoginAdmin)).access_token,
      ).toBeDefined();
    }),
      it('should throw a Bad Request if the user does not exist', async () => {
        const error = new BadRequestException();
        try {
          const testData = {
            email: 'email@e.mail',
            password: testLoginAdmin.password,
          } as LoginAdminDto;
          await service.loginAdmin(testData);
          fail();
        } catch (e) {
          expect(e.response === error.getResponse());
        }
      }),
      // Password checks and lockouts are gone from loginAdmin: youth workers
      // authenticate via AD SSO and loginAdmin only issues the token.
      it('should not require a correct password', async () => {
        const testData = {
          email: testLoginAdmin.email,
          password: 'doubleHush',
        } as LoginAdminDto;
        expect((await service.loginAdmin(testData)).access_token).toBeDefined();
      });
  });

  describe('Login Youth', () => {
    it('should return a access token token if login is succseful', async () => {
      expect(
        (await service.loginJunior(testLoginJunior)).access_token,
      ).toBeDefined();
    }),
      it('should throw an error if the challenge provided has alread been used', async () => {
        const error = new UnauthorizedException();
        try {
          await service.loginJunior(testLoginJunior);
          fail();
        } catch (e) {
          expect(e.response === error.getResponse());
        }
      }),
      it('should throw a Bad Request if the user does not exist', async () => {
        const error = new BadRequestException();
        try {
          const testData = {
            id: `${testLoginJunior.id}estetse`,
            challenge: testLoginJunior.challenge,
          } as LoginJuniorDto;
          await service.loginJunior(testData);
          fail();
        } catch (e) {
          expect(e.response === error.getResponse());
        }
      });
  });
});
