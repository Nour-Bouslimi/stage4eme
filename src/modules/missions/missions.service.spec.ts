import { MissionsService } from './missions.service';
import { Mission } from './entities/mission.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Message } from '../chat/entities/message.entity';
import { Notation } from '../ratings/entities/notation.entity';

describe('MissionsService.deleteMission', () => {
  let service: MissionsService;
  let missionRepo: any;
  let matching: any;
  let usersService: any;
  let geolocationService: any;
  let notificationsService: any;
  let notificationsGateway: any;

  beforeEach(() => {
    missionRepo = {
      findOne: jest.fn(),
      delete: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };
    matching = { findCandidates: jest.fn() };
    usersService = { findById: jest.fn(), save: jest.fn() };
    geolocationService = { route: jest.fn() };
    notificationsService = { create: jest.fn() };
    notificationsGateway = { broadcastNotification: jest.fn() };

    service = new MissionsService(
      missionRepo,
      matching,
      usersService,
      geolocationService,
      notificationsService,
      notificationsGateway,
    );
  });

  it('supprime la mission et ses dépendances liées', async () => {
    const mission = { id: 'mission-1' } as Mission;
    missionRepo.findOne.mockResolvedValue(mission);

    const notificationRepo = { delete: jest.fn().mockResolvedValue({}) };
    const messageRepo = { delete: jest.fn().mockResolvedValue({}) };
    const notationRepo = { delete: jest.fn().mockResolvedValue({}) };

    missionRepo.manager.transaction.mockImplementation(async (callback: any) => {
      return callback({
        getRepository: (entity: unknown) => {
          if (entity === Notification) return notificationRepo;
          if (entity === Message) return messageRepo;
          if (entity === Notation) return notationRepo;
          return { delete: jest.fn() };
        },
      });
    });

    await service.deleteMission('mission-1');

    expect(missionRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'mission-1' },
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true },
        notifications: true,
        notation: true,
      },
    });
    expect(notificationRepo.delete).toHaveBeenCalled();
    expect(messageRepo.delete).toHaveBeenCalled();
    expect(notationRepo.delete).toHaveBeenCalled();
    expect(missionRepo.delete).toHaveBeenCalledWith('mission-1');
  });
});
