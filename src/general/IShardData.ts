export interface IChampionsByRarity {
    _id?: string;
    rares: IChamp[],
    epics: IChamp[],
    legendaries: IChamp[]
}

export interface IChamp {
    name: string,
    affinity: string,
    id: number
}

export interface IShardEvent {
    event: string | undefined,
    tenTimes: string[] | undefined,
    image: string | undefined,
    startDate: Date,
    endDate: Date
}

export interface IShardData {
    _id?: string;
    userID?: string
    tokens?: number
    lastClaim?: Date
    mercy?: Mercy
    shards?: Shards
    champions?: Champions
  }
  
  export interface Mercy {
    ancient: {
      epic: number
      legendary: number
    },
    void: {
      epic: number
      legendary: number
    },
    sacred: {
      epic: number
      legendary: number
    }
  }
  
  export interface Shards {
    ancient: Ancient
    void: Void
    sacred: Sacred
  }
  
  export interface Ancient {
    pulled: number
  }
  
  export interface Void {
    pulled: number
  }
  
  export interface Sacred {
    pulled: number
  }
  
  export interface Champions {
    rare: Champion[]
    epic: Champion[]
    legendary: Champion[]
  }
  
  export interface Champion {
    name: string
    affinity: string
    number: number
  }
  

  export interface IChampPull {
    champ: string,
    rarity: string,
    affinity?: string
}
  
export function msToTime(duration: number) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  return `${(hours > 0) ? hours + " hours" : ""} ${(minutes > 0) ? minutes + " minutes" : ""}${(seconds > 0) ? " and " + seconds + " seconds" : ""}`
}