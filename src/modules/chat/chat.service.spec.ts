import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let msgRepo: any;

  beforeEach(() => {
    msgRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };

    service = new ChatService(
      msgRepo,
      { findEntityById: jest.fn() },
      { findById: jest.fn() },
      { create: jest.fn() },
      { uploadBuffer: jest.fn() },
    ) as any;
  });

  it('edits a message when the author is the current user', async () => {
    const existingMessage = {
      id: 'msg-1',
      contenu: 'old',
      auteur: { id: 'user-1' },
    };
    msgRepo.findOne.mockResolvedValue(existingMessage);
    msgRepo.save.mockResolvedValue({
      ...existingMessage,
      contenu: 'new content',
    });

    const result = await service.updateMessage('msg-1', 'user-1', {
      contenu: 'new content',
    });

    expect(result.contenu).toBe('new content');
    expect(msgRepo.save).toHaveBeenCalled();
  });

  it('throws when a user tries to edit another user message', async () => {
    const existingMessage = {
      id: 'msg-2',
      contenu: 'old',
      auteur: { id: 'user-1' },
    };
    msgRepo.findOne.mockResolvedValue(existingMessage);

    await expect(
      service.updateMessage('msg-2', 'user-2', { contenu: 'new content' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deletes a message when the author is the current user', async () => {
    const existingMessage = {
      id: 'msg-3',
      contenu: 'to delete',
      auteur: { id: 'user-1' },
      mission: { id: 'mission-1' },
    };
    msgRepo.findOne.mockResolvedValue(existingMessage);
    msgRepo.remove.mockResolvedValue(existingMessage);

    const result = await service.deleteMessage('msg-3', 'user-1');

    expect(result.deleted).toBe(true);
    expect(msgRepo.remove).toHaveBeenCalled();
  });

  it('throws when the message does not exist', async () => {
    msgRepo.findOne.mockResolvedValue(null);

    await expect(service.deleteMessage('missing', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('saves an image message with the uploaded cloudinary url', async () => {
    const svc = service as any;
    svc.missionsService.findEntityById.mockResolvedValue({
      id: 'mission-1',
      client: { id: 'client-1' },
      livreur: { id: 'driver-1' },
    });
    svc.usersService.findById.mockResolvedValue({ id: 'client-1' });
    svc.cloudinaryService.uploadBuffer.mockResolvedValue({
      secure_url: 'https://cdn.example.com/image.jpg',
    });
    msgRepo.create.mockImplementation((payload) => payload);
    msgRepo.save.mockImplementation(async (payload) => payload);

    const result = await service.sendImageMessage(
      'client-1',
      { missionId: 'mission-1', contenu: 'photo' },
      { buffer: Buffer.from('fake image'), originalname: 'photo.jpg' } as any,
    );

    expect(svc.cloudinaryService.uploadBuffer).toHaveBeenCalled();
    expect(result.urlMedia).toBe('https://cdn.example.com/image.jpg');
    expect(result.type).toBe('IMAGE');
  });
});
