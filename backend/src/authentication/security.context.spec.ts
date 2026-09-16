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
import { JuniorModule } from '../junior/junior.module';
import { Challenge, Junior } from '../junior/entities';
import { SmsModule } from '../sms/sms.module';
import { SecurityContextDto, AcsDto } from './dto';
import { sign } from 'cookie-signature';
import { secretString } from './secret';
import { HttpModule } from '@nestjs/axios';

describe('AuthenticationService', () => {
  let module: TestingModule;
  let connection: DataSource;
  let service: AuthenticationService;

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
        AuthenticationService,
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

  describe('Security Context', () => {
    const sessionIndex = '12345';
    const nameId = 'test';
    const firstName = 'Test1';
    const lastName = 'Test2';
    const zipCode = '12345';
    const twoHoursAgo = new Date().getTime() / 1000 - 3600 * 2;
    const twoHoursLeft = new Date().getTime() / 1000 + 3600 * 2;
    // The expiry timestamp is part of the signed string, so it cannot be
    // swapped on a generated context without invalidating the signature.
    const signFields = (expiryTime: string) =>
      sign(
        `${expiryTime} ${sessionIndex} ${nameId} ${firstName} ${lastName} ${zipCode}`,
        secretString,
      );
    let securityContext: SecurityContextDto;
    it('should generate security context', async () => {
      const acsData = {
        sessionIndex,
        nameId,
        firstName,
        lastName,
        zipCode,
      } as AcsDto;
      securityContext = service.generateSecurityContext(acsData);
      expect(securityContext.signedString).toEqual(
        signFields(securityContext.expiryTime),
      );
    }),
      it('should validate security context to true ', async () => {
        expect(service.validateSecurityContext(securityContext)).toEqual(true);
      }),
      it('should validate security context to false when expired ', async () => {
        const expiryTime = twoHoursAgo.toString();
        const scData = {
          sessionIndex,
          nameId,
          firstName,
          lastName,
          zipCode,
          signedString: signFields(expiryTime),
          expiryTime,
        } as SecurityContextDto;
        expect(service.validateSecurityContext(scData)).toEqual(false);
      }),
      it('should validate security context to false when signature wrong ', async () => {
        const scData = {
          sessionIndex,
          nameId,
          firstName,
          lastName,
          zipCode,
          signedString: 'test',
          expiryTime: twoHoursLeft.toString(),
        } as SecurityContextDto;
        expect(service.validateSecurityContext(scData)).toEqual(false);
      });
  });
});
