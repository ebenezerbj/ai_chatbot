export enum KBCategory {
    GENERAL = 'general',
    PRODUCT = 'product',
    SUPPORT = 'support',
    TECHNICAL = 'technical',
    PRICING = 'pricing',
    POLICY = 'policy',
    FAQ = 'faq',
    TUTORIAL = 'tutorial',
    FEATURE = 'feature',
    TROUBLESHOOTING = 'troubleshooting'
}

export interface KBMetadata {
    category: KBCategory;
}

export interface KBEntry {
    content: string;
    metadata: KBMetadata;
}
