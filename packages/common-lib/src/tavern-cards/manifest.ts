export interface ManifestEntry {
    path: string;
    coverPath: string | null;
    postCoverPath: string | null;
    title: string;
}

export interface Manifest {
    [key: string]: ManifestEntry;
}
