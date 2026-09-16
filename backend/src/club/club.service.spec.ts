import { Test, TestingModule } from '@nestjs/testing';
import { ClubService } from './club.service';
import { DataSource } from 'typeorm';
import { getTestDB } from '../../test/testdb';
import { AppModule } from '../app.module';
import { JuniorModule } from '../junior/junior.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '../../test/Mock';
import { Junior } from '../junior/entities';
import { ClubModule } from './club.module';
import { Club, CheckIn } from './entities';
import { RegisterJuniorDto } from '../junior/dto';
import { JuniorService } from '../junior/junior.service';
import { LogBookDto } from './dto';
import { LogBookViewModel } from './vm/logbook.vm';
import { Gender } from '../utils/constants';

describe('ClubService', () => {
  let module: TestingModule;
  let service: ClubService;
  let connection: DataSource;
  let juniorService: JuniorService;
  const testJuniors: Junior[] = [];
  let testClub: Club;

  // Fixed ages instead of fixed birthdays: the logbook buckets by age range at
  // the time of the test run, so absolute dates would drift out of their
  // buckets as years pass.
  const birthdayYearsAgo = (years: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString();
  };

  beforeAll(async () => {
    connection = await getTestDB();
    module = await Test.createTestingModule({
      imports: [AppModule, JuniorModule, ClubModule],
      providers: [ClubService, {
        provide: getRepositoryToken(Club),
        useFactory: repositoryMockFactory,
      }, {
          provide: getRepositoryToken(Junior),
          useFactory: repositoryMockFactory,
        },
        {
          provide: getRepositoryToken(CheckIn),
          useFactory: repositoryMockFactory,
        }],
    }).overrideProvider(DataSource)
      .useValue(connection)
      .compile();

    const testRegisterYouth = {
      phoneNumber: '04122345111',
      firstName: 'Auth jr',
      lastName: 'Senior',
      postCode: '02130',
      parentsName: 'Auth Senior',
      parentsPhoneNumber: '0411234567',
      gender: 'M',
      birthday: birthdayYearsAgo(14), // logbook age range 13-15
      homeYouthClub: 'Tikkurila',
      status: 'accepted',
      photoPermission: false,
    } as RegisterJuniorDto;

    const testRegisterYouth2 = {
      phoneNumber: '04122345999',
      firstName: 'Auth jr',
      lastName: 'Senior',
      postCode: '02130',
      parentsName: 'Auth Senior',
      parentsPhoneNumber: '0411234567',
      gender: 'M',
      birthday: birthdayYearsAgo(21), // logbook age range 20-25
      homeYouthClub: 'Tikkurila',
      status: 'accepted',
      photoPermission: false,
    } as RegisterJuniorDto;

    const testRegisterYouth3 = {
      phoneNumber: '04122345998',
      firstName: 'Auth jr',
      lastName: 'Senior',
      postCode: '02130',
      parentsName: 'Auth Senior',
      parentsPhoneNumber: '0411234567',
      gender: 'F',
      birthday: birthdayYearsAgo(21), // logbook age range 20-25
      homeYouthClub: 'Tikkurila',
      status: 'accepted',
      photoPermission: false,
    } as RegisterJuniorDto;

    juniorService = module.get<JuniorService>(JuniorService);
    service = module.get<ClubService>(ClubService);
    // There is no API for creating clubs; production inserts them straight into
    // the clubs table (see README), so the test does the same.
    await connection.getRepository(Club).save({ name: 'Testitalo', postCode: '02130' });
    // noSMS: the test environment has no SMS gateway, and these juniors never log in.
    await juniorService.registerJunior(testRegisterYouth, true);
    await juniorService.registerJunior(testRegisterYouth2, true);
    await juniorService.registerJunior(testRegisterYouth3, true);
    testJuniors.push(await juniorService.getJuniorByPhoneNumber(testRegisterYouth.phoneNumber));
    testJuniors.push(await juniorService.getJuniorByPhoneNumber(testRegisterYouth2.phoneNumber));
    testJuniors.push(await juniorService.getJuniorByPhoneNumber(testRegisterYouth3.phoneNumber));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Get clubs', () => {
    it('should return a list of clubs', async () => {
      testClub = (await service.getClubs())[0];
      expect(testClub).toBeDefined();
    });
  });

  // If you change junior used in this test, do same to test below, they are chained
  describe('CheckInJunior', () => {
    it('Should return true when successful', async () => {
      const result = await service.checkInJunior({ juniorId: testJuniors[0].id, clubId: testClub.id });
      expect(result).toBeTruthy();
    });
  });

  describe('CheckInJuniorDuplicate', () => {
    it('Should return true when trying to check same junior again', async () => {
      const result = await service.checkIfAlreadyCheckedIn(testJuniors[0].id, testClub.id);
      expect(result).toBeTruthy();
    });
  });

  describe('CheckInJuniorDuplicate', () => {
    it('Should return false when trying to check new junior', async () => {
      const result = await service.checkIfAlreadyCheckedIn(testJuniors[1].id, testClub.id);
      expect(result).toBeFalsy();
    });
  });

  describe('getCheckinsForClub', () => {
    it('Should return a list of all juniors who have checked in at the current club', async () => {
      await service.checkInJunior({ juniorId: testJuniors[1].id, clubId: testClub.id });
      const checkIns = await service.getCheckinsForClub(testClub.id);
      const containsJunior1 = checkIns.some(c => c.junior.id === testJuniors[0].id && c.club.id === testClub.id);
      const containsJunior2 = checkIns.some(c => c.junior.id === testJuniors[1].id && c.club.id === testClub.id);
      expect(containsJunior1 && containsJunior2).toBeTruthy();
    });
  });

  describe('getCheckinsForClubForDate', () => {
    it('Should return a list of all checkins for the given club on the given date', async () => {
      const testClubDto = { clubId: testClub.id, date: new Date().toISOString() } as LogBookDto;
      const results = await service.getCheckinsForClubForDate(testClubDto);
      expect(results.length > 0);
    });
  });

  describe('generateLogBook', () => {
    // The three checked-in juniors: one 14-year-old male, one 21-year-old male,
    // one 21-year-old female.
    const verifyLogbookTotals = (logbook: LogBookViewModel) => {
      const countByGender = (gender: string) =>
        logbook.statistics.find(s => s.gender === gender).count;
      expect(countByGender(Gender.Male)).toBe(2);
      expect(countByGender(Gender.Female)).toBe(1);
      expect(countByGender(Gender.Other)).toBe(0);

      const ageRangeTotals = new Map<string, number>();
      logbook.statistics.forEach(s =>
        s.ageRanges.forEach(r =>
          ageRangeTotals.set(r.ageRange, (ageRangeTotals.get(r.ageRange) ?? 0) + r.count)));
      expect(ageRangeTotals.get('13-15')).toBe(1);
      expect(ageRangeTotals.get('20-25')).toBe(2);
    };

    beforeAll(async () => {
      await service.checkInJunior({ juniorId: testJuniors[2].id, clubId: testClub.id });
    }),
      it('Should return a "logbook" entry containing the correct totals for ages and genders', async () => {
        const logbook = await service.generateLogBook({ clubId: testClub.id, date: new Date().toISOString() });
        verifyLogbookTotals(logbook);
      }),
      it('Should ignore duplicate check-ins for the given date', async () => {
        await service.checkInJunior({ clubId: testClub.id, juniorId: testJuniors[2].id });
        const logbook = await service.generateLogBook({ clubId: testClub.id, date: new Date().toISOString() });
        verifyLogbookTotals(logbook);
      });
  });
});
