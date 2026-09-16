import { Test, TestingModule } from '@nestjs/testing';
import { JuniorService } from './junior.service';
import { JuniorModule } from './junior.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '../../test/Mock';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { getTestDB } from '../../test/testdb';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AdminModule } from '../admin/admin.module';
import { Admin } from '../admin/entities';
import { ConflictException } from '@nestjs/common';
import { RegisterJuniorDto, LoginJuniorDto, EditJuniorDto } from './dto';
import { ListControlDto } from '../common/dto';
import { Challenge, Junior } from './entities';
import { SmsModule } from '../sms/sms.module';
import { HttpModule } from '@nestjs/axios';

describe('JuniorService', () => {
  let module: TestingModule;
  let service: JuniorService;
  let connection: DataSource;

  const testRegisterYouth = {
    phoneNumber: '04122345000',
    firstName: 'Auth jr',
    lastName: 'Senior',
    postCode: '02130',
    parentsName: 'Auth Senior',
    parentsPhoneNumber: '0411234567',
    school: 'random school',
    class: '5A',
    gender: 'M',
    birthday: new Date('05-05-2005').toISOString(),
    homeYouthClub: 'Tikkurila',
    status: 'accepted',
    photoPermission: true,
  } as RegisterJuniorDto;
  let testLoginYouth: LoginJuniorDto;
  let juniorToEdit: EditJuniorDto;

  const phoneNumberTransformer = (str: string) =>
    str.charAt(0) === '0' ? str.replace('0', '358') : str;

  // listAllJuniors without pagination controls applies take(0), which typeorm
  // executes as LIMIT 0 - always page explicitly.
  const listJuniors = () =>
    service.listAllJuniors({
      pagination: { page: 1, perPage: 100 },
    } as ListControlDto);

  beforeAll(async () => {
    connection = await getTestDB();
    module = await Test.createTestingModule({
      imports: [
        AppModule,
        JuniorModule,
        AdminModule,
        AuthenticationModule,
        SmsModule,
        HttpModule,
      ],
      providers: [
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
      ],
    })
      .overrideProvider(DataSource)
      .useValue(connection)
      .compile();

    service = module.get<JuniorService>(JuniorService);
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

  describe('Register Youth', () => {
    beforeAll(async () => {
      // noSMS: the test environment has no SMS gateway. resetLogin creates the
      // login challenge before it fails on the missing gateway.
      await service.registerJunior(testRegisterYouth, true);
      await service
        .resetLogin(phoneNumberTransformer(testRegisterYouth.phoneNumber))
        .catch(() => undefined);
    }),
      it('should return a value (currently challenge data whilst waiting for further workflow)', async () => {
        const challenge = await service.getChallengeByPhoneNumber(
          testRegisterYouth.phoneNumber,
        );
        testLoginYouth = {
          id: challenge.id,
          challenge: challenge.challenge,
        };
        expect(testLoginYouth.challenge).toBeDefined();
      }),
      it('should add the user to the database following a succesful registration', async () => {
        const response = await service.getJuniorByPhoneNumber(
          testRegisterYouth.phoneNumber,
        );
        expect(
          response.phoneNumber ===
            phoneNumberTransformer(
              testRegisterYouth.phoneNumber.toLowerCase(),
            ) &&
            response.firstName === testRegisterYouth.firstName &&
            response.lastName === testRegisterYouth.lastName,
        ).toBeTruthy();
      }),
      it('should thrown a Conflict if the phone number already exists', async () => {
        const error = new ConflictException();
        try {
          await service.registerJunior(testRegisterYouth);
          fail();
        } catch (e) {
          expect(e.response === error.getResponse());
        }
      });
  });

  describe('Get All Juniors', () => {
    it('Should return a list containing all juniors', async () => {
      const response = await listJuniors();
      const isAnArray = Array.isArray(response.data);
      const containsJuniors = response.data.some(
        (e) =>
          e.phoneNumber ===
          phoneNumberTransformer(testRegisterYouth.phoneNumber),
      );
      expect(isAnArray && containsJuniors).toBeTruthy();
    });
  });

  describe('Edit Junior', () => {
    beforeAll(async () => {
      juniorToEdit = (await listJuniors()).data[0];
    }),
      it(' should change values if valid data is provided', async () => {
        const dto = {
          ...juniorToEdit,
          phoneNumber: '04122345600',
        } as EditJuniorDto;
        // The admin id only gates un-expiring a junior, which this edit is not.
        await service.editJunior(dto, 'test-admin-id');
        const updatedJunior = await service.getJuniorByPhoneNumber(
          dto.phoneNumber,
        );
        const updatedList = await listJuniors();
        expect(
          updatedJunior.phoneNumber ===
            phoneNumberTransformer(dto.phoneNumber) &&
            !updatedList.data.some(
              (e) =>
                e.phoneNumber ===
                phoneNumberTransformer(juniorToEdit.phoneNumber.toLowerCase()),
            ),
        ).toBeTruthy();
      });
  });

  describe('Delete Junior', () => {
    let juniorToDelete: string;
    beforeAll(async () => {
      juniorToDelete = (await listJuniors()).data[0].id;
    }),
      it('Should delete the user provided', async () => {
        await service.deleteJunior(juniorToDelete);
        const juniorList = (await listJuniors()).data;
        expect(juniorList.findIndex((j) => j.id === juniorToDelete) < 0).toBeTruthy();
      });
  });
});
