export declare enum ChatRoomType {
    DIRECT = "DIRECT",
    GROUP = "GROUP"
}
export declare class CreateRoomDto {
    name?: string;
    type: ChatRoomType;
    participantIds: string[];
}
