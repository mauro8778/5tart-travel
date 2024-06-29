import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AgencyEntity } from "src/entities/agency.entity";
import { TourEntity } from "src/entities/tour.entity";
import { mailsServices } from "src/mails/mails.service";
import { MapsService } from "src/maps/maps.service";
import { Repository } from "typeorm";

@Injectable()
export class TourRepository {
    
    
    private readonly logger = new Logger(mailsServices.name);
    constructor(@InjectRepository(TourEntity)
    private tourRepository: Repository<TourEntity>,
        @InjectRepository(AgencyEntity)
        private agencyRepository: Repository<AgencyEntity>,
        private readonly mapsservice: MapsService,
    private readonly mailservice:mailsServices) { }

    async getTours() {
        const Tours: TourEntity[] = await this.tourRepository.find({ relations: { agency: true } })

        if (Tours.length == 0) {
            return 'No hay Publicaciones registradas en la base de datos'
        }

        return Tours
    }

    async createTour(tour, userId) {

        const agency: AgencyEntity = await this.agencyRepository.findOneBy({ id: userId })

        if (!agency) {
            throw new UnauthorizedException('Problema en los datos del usuario agencia')
        }

        const geocodeData = await this.mapsservice.geocodeAddress(tour.address)

        const newTour = await this.tourRepository.create({
            ...tour,
            country: geocodeData.country,
            region: geocodeData.region,
            state: geocodeData.state,
            lat: geocodeData.lat,
            lon: geocodeData.lon,
            display_name: geocodeData.display_name,
            agency: agency
        });

        await this.tourRepository.save(newTour)

        return newTour
    }

    async deleteAgency(id: string) {
        const Tour = await this.tourRepository.findOneBy({ id });

        if (!Tour) {
            throw new BadRequestException('La publicacion no existe')
        }

        await this.tourRepository.remove(Tour)

        return 'Publicacion eliminada correctamente'

    }

    async getToursBus() {
        const tours: TourEntity[] = await this.tourRepository.find({ where: { transportType: 'bus' }, relations: { agency: true } });

        if (tours.length == 0) {
            return 'No hay viajes con Autobus todavía';
        }

        return tours;
    }

    async getToursPlane() {
        const tours: TourEntity[] = await this.tourRepository.find({ where: { transportType: 'plane' }, relations: { agency: true } });

        if (tours.length == 0) {
            return 'No hay viajes con Avion todavía';
        }

        return tours;
    }

    async getToursOferta() {
        const tours: TourEntity[] = await this.tourRepository.find({ where: { oferta: true }, relations: { agency: true } });

        if (tours.length == 0) {
            return 'No hay viajes con Ofertas todavía';
        }

        return tours;
    }
    async mailOfertas(email: string): Promise<void> {
        const tours: TourEntity[] = await this.tourRepository.find({ where: { oferta: true }, relations: { agency: true } });
      
        if (tours.length === 0) {
          this.logger.warn('No hay viajes con ofertas disponibles.');
          throw new Error('No hay viajes con Ofertas todavía');
        }
      
        const subject = 'Ofertas de Tours Disponibles';
        const textBody = `Hola,
      
        Aquí tienes las ofertas de tours disponibles:
      
        ${tours.map(tour => `${tour.title} - $${tour.price} - ${tour.destino}`).join('\n')}
      
        ¡Esperamos que encuentres un tour de tu interés!
      
        Saludos,
        El equipo de 5tart Travel`;
      
        const htmlBody = `
        <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ofertas Disponibles</title>
    <style>
        /* Estilos generales */
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 800px;
            margin: 20px auto;
            background-color: #ffffff;
            border: 2px solid #003366;
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-sizing: border-box;
        }
        .card {
            width: calc(50% - 20px); /* Ancho fijo para las tarjetas en dos columnas */
            margin: 10px;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 10px;
            text-align: left;
            overflow: hidden; /* Evita que el contenido desborde */
            display: inline-block; /* Alinear tarjetas en línea */
            vertical-align: top; /* Alinear tarjetas en la parte superior */
            box-sizing: border-box;
        }
        .card img {
            width: 100%;
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .card h2 {
            color: #003366;
            font-size: 16px; /* Tamaño del título */
            margin-bottom: 5px;
        }
        .card p {
            font-size: 14px; /* Tamaño del texto */
            margin-bottom: 5px;
        }
        .btn {
            display: inline-block;
            background-color: #003366;
            color: #ffffff;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 20px;
            transition: background-color 0.3s ease;
        }
        .btn:hover {
            background-color: #001f4d;
        }

        /* Estilos para dispositivos móviles */
        @media only screen and (max-width: 600px) {
            .card {
                width: 100%; /* Una columna en dispositivos pequeños */
                margin: 10px auto; /* Margen automático */
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Ofertas Disponibles</h1>
        <p>¡Descubre los mejores paquetes y reserva tu aventura hoy! También puedes explorar otros emocionantes paquetes disponibles.</p>
        <!-- Iteración sobre los tours para mostrar cada tarjeta -->
        <!-- Asegúrate de que cada tarjeta tenga un tamaño fijo y se ajuste al contenido -->
        ${tours.map(tour => `
            <div class="card">
                <img src="${tour.imgUrl}" alt="${tour.title}">
                <h2>${tour.title}</h2>
                <p><strong>Destino:</strong> ${tour.destino}</p>
                <p><strong>Precio:</strong> $${tour.price}</p>
                <p>${tour.description.substring(0, 80)}${tour.description.length > 80 ? '...' : ''}</p> <!-- Mostrar solo los primeros 80 caracteres de la descripción -->
            </div>
        `).join('')}
        <a href="url_de_tu_pagina_principal" class="btn">Ir a la página principal</a>
    </div>
</body>
</html>







`;
      
        this.logger.log(`Enviando correo a ${email} con las ofertas disponibles.`);
        await this.mailservice.sendMail(email, subject, textBody, htmlBody);
      }
}