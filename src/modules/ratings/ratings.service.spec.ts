import { RatingsService } from './ratings.service';

describe('RatingsService', () => {
  let service: RatingsService;
  let notationRepo: any;
  let missionsService: any;
  let usersService: any;
  let notificationsService: any;
  let notificationsGateway: any;

  beforeEach(() => {
    notationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    missionsService = { findEntityById: jest.fn() };
    usersService = { findById: jest.fn(), save: jest.fn() };
    notificationsService = { create: jest.fn() };
    notificationsGateway = { broadcastNotification: jest.fn() };

    service = new RatingsService(
      notationRepo,
      missionsService,
      usersService,
      notificationsService,
      notificationsGateway,
    );
  });

  it('returns the rating summary for a driver', async () => {
    usersService.findById.mockResolvedValue({ id: 'driver-1', role: 'LIVREUR' });
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        noteMoyenne: '4.50',
        totalNotes: '3',
        sommeEtoiles: '13',
      }),
    };
    notationRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    notationRepo.find.mockResolvedValue([
      {
        id: 'r1',
        etoiles: 5,
        appreciations: [],
        commentaire: 'Parfait',
        creeLe: new Date('2026-01-01T00:00:00Z'),
        client: { id: 'client-1', prenom: 'Jean', nom: 'Dupont', photo: null },
        mission: { id: 'm1' },
      },
    ]);

    const result = await service.getRatingSummaryByLivreur('driver-1');

    expect(result).toEqual({
      livreurId: 'driver-1',
      noteMoyenne: 4.5,
      totalNotes: 3,
      sommeEtoiles: 13,
      reviews: [
        {
          id: 'r1',
          etoiles: 5,
          appreciations: [],
          commentaire: 'Parfait',
          creeLe: new Date('2026-01-01T00:00:00Z'),
          client: { id: 'client-1', prenom: 'Jean', nom: 'Dupont', photo: null },
          missionId: 'm1',
        },
      ],
    });
  });

  it('returns the total number of ratings for a driver', async () => {
    usersService.findById.mockResolvedValue({ id: 'driver-1', role: 'LIVREUR' });
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(4),
    };
    notationRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getTotalRatingsCountByLivreur('driver-1');

    expect(result).toEqual({
      livreurId: 'driver-1',
      totalNotes: 4,
    });
  });
});
