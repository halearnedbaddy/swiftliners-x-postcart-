import { useState, useEffect } from 'react';

export interface Country {
    code: string;
    name: string;
    currencyCode: string;
    currencySymbol: string;
    phonePrefix: string;
    defaultLanguage: string;
}

export const SUPPORTED_COUNTRIES: Country[] = [
    { code: 'KE', name: 'Kenya', currencyCode: 'KES', currencySymbol: 'KES', phonePrefix: '+254', defaultLanguage: 'sw' },
    { code: 'UG', name: 'Uganda', currencyCode: 'UGX', currencySymbol: 'USh', phonePrefix: '+256', defaultLanguage: 'en' },
    { code: 'TZ', name: 'Tanzania', currencyCode: 'TZS', currencySymbol: 'TZS', phonePrefix: '+255', defaultLanguage: 'sw' },
    { code: 'RW', name: 'Rwanda', currencyCode: 'RWF', currencySymbol: 'RWF', phonePrefix: '+250', defaultLanguage: 'fr' },
];

function getInitialCountry(): Country {
    if (typeof window === 'undefined') return SUPPORTED_COUNTRIES[0];
    const saved = localStorage.getItem('payloom_country');
    const country = saved ? SUPPORTED_COUNTRIES.find(c => c.code === saved) : null;
    return country ?? SUPPORTED_COUNTRIES[0];
}

function getInitialLanguage(): string {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('payloom_lang') || 'en';
}

export function useCurrency() {
    const [selectedCountry, setSelectedCountry] = useState<Country>(getInitialCountry);
    const [language, setLanguage] = useState<string>(getInitialLanguage);

    useEffect(() => {
        const saved = localStorage.getItem('payloom_country');
        if (saved) {
            const country = SUPPORTED_COUNTRIES.find(c => c.code === saved);
            if (country) setSelectedCountry(country);
        }
        const savedLang = localStorage.getItem('payloom_lang');
        if (savedLang) setLanguage(savedLang);
    }, []);

    const changeCountry = (code: string) => {
        const country = SUPPORTED_COUNTRIES.find(c => c.code === code);
        if (country) {
            setSelectedCountry(country);
            localStorage.setItem('payloom_country', code);
            // Also update language if not manually set and persist it
            if (!localStorage.getItem('payloom_lang')) {
                setLanguage(country.defaultLanguage);
                localStorage.setItem('payloom_lang', country.defaultLanguage);
                window.dispatchEvent(new CustomEvent('payloom-language-changed', { detail: country.defaultLanguage }));
            }
        }
    };

    const changeLanguage = (lang: string) => {
        setLanguage(lang);
        localStorage.setItem('payloom_lang', lang);
        window.dispatchEvent(new CustomEvent('payloom-language-changed', { detail: lang }));
    };

    const formatPrice = (amount: number, currencyCode?: string) => {
        const currency = currencyCode || selectedCountry.currencyCode;
        const localeMap: Record<string, string> = {
            'KES': 'en-KE',
            'UGX': 'en-UG',
            'TZS': 'en-TZ',
            'RWF': 'en-RW',
            'USD': 'en-US',
        };

        return new Intl.NumberFormat(localeMap[currency] || 'en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return { selectedCountry, changeCountry, formatPrice, SUPPORTED_COUNTRIES, language, changeLanguage };
}
