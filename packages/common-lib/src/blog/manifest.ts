export interface FrontMatter {
    title: string;
    category?: string;
    tags?: string[];
    cover?: string;
}

export interface PostDate {
    year: string;
    month: string;
    day: string;
}

export interface PostManifest {
    id: string; // 帖子唯一id，格式为`YYYY/MM/DD/帖子文件名（去掉.md）`
    path: string; // 帖子文件的路径，相对于`sites/blog/posts`
    title: string;
    category: string[]; // 解析front matter中的category，按"/"分割。如果front matter中没有category则为"未分类"
    tags: string[];
    summary: string; // 如果帖子正文部分拥有`<!-- more -->`注释，则该字段为帖子正文在该注释之前的部分。否则，为帖子正文的前3个段落（每出现两次连续换行就视为变更段落，忽略代码块等markdown特殊语法）
    cover?: string; // 如果帖子front matter中指定了cover，则为该值，否则，为帖子中第一幅图片的路径（通过搜索markdown图片标签找到），如果帖子中没有图片，则留空。
    createDate: PostDate;
    updateDate: PostDate;
}

export interface IndexManifest {
    pages: number;
}

export interface IndexPageManifest {
    posts: string[];
}

export interface ArchiveManifest {
    years: string[];
}

export interface ArchiveYearManifest {
    months: string[];
    cover?: string;
}

export interface ArchiveMonthManifest {
    days: string[];
    cover?: string;
}

export interface ArchiveDayManifest {
    pages: number;
    cover?: string;
}

export interface ArchivePageManifest {
    posts: string[];
}

export interface CategoriesManifest {
    topCategories: string[];
}

export interface CategoryManifest {
    children: string[];
    pages: number;
}

export interface CategoryPageManifest {
    posts: string[];
}

export interface TagsManifest {
    tags: string[];
}

export interface TagManifest {
    pages: number;
}

export interface TagPageManifest {
    posts: string[];
}
