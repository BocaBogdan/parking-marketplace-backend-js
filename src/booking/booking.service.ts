import { Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity.js';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  create(userId: string, createBookingDto: CreateBookingDto) {
    const newBooking = this.bookingRepository.create({
      ...createBookingDto,
      userId,
    });
    return this.bookingRepository.save(newBooking);
  }

  findAll() {
    return this.bookingRepository.find();
  }

  mine(userId: string) {
    return this.bookingRepository.findBy({ userId });
  }

  findOne(id: string) {
    return this.bookingRepository.findBy({ id });
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    await this.bookingRepository.update(id, updateBookingDto);

    return this.findOne(id);
  }

  remove(id: string) {
    return this.bookingRepository.delete(id);
  }
}
