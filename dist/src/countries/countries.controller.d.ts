import { CountriesService } from './countries.service';
export declare class CountriesController {
    private readonly countriesService;
    constructor(countriesService: CountriesService);
    findAll(isActive?: string, isEU?: string): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        nativeName: string | null;
        phoneCode: string | null;
        isEU: boolean;
    }[]>;
}
