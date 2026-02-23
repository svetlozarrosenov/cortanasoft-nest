import { DemoRequestsService } from './demo-requests.service';
import { CreateDemoRequestDto } from './dto';
export declare class DemoRequestsController {
    private demoRequestsService;
    constructor(demoRequestsService: DemoRequestsService);
    create(dto: CreateDemoRequestDto): Promise<{
        success: boolean;
        message: string;
        demoRequest: {
            id: string;
            name: string;
            email: string;
        };
    }>;
}
