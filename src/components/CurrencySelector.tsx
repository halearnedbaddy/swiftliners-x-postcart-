import { useCurrency } from '@/hooks/useCurrency';
import { useTranslations } from '@/hooks/useTranslations';
import { Globe, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function CurrencySelector() {
    const { selectedCountry, changeCountry, language, changeLanguage, SUPPORTED_COUNTRIES } = useCurrency();
    const { t } = useTranslations();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', name: t('common.english') },
        { code: 'sw', name: t('common.swahili') },
        { code: 'fr', name: t('common.french') },
    ];

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm font-bold text-gray-700"
            >
                <Globe size={16} className="text-primary" />
                <span>{selectedCountry.code} • {language.toUpperCase()}</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 animate-in fade-in zoom-in duration-200">
                        <div className="px-4 py-2 border-b border-gray-50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('common.regionCurrency')}</p>
                            <div className="grid grid-cols-1 gap-1">
                                {SUPPORTED_COUNTRIES.map((country) => (
                                    <button
                                        key={country.code}
                                        onClick={() => {
                                            changeCountry(country.code);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-between ${
                                            selectedCountry.code === country.code ? 'text-primary font-bold bg-primary/5' : 'text-gray-700'
                                        }`}
                                    >
                                        <span>{country.name}</span>
                                        <span className="text-xs opacity-50">{country.currencyCode}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-4 py-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{t('common.language')}</p>
                            <div className="grid grid-cols-1 gap-1">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            localStorage.setItem('payloom_lang', lang.code);
                                            changeLanguage(lang.code);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-between ${
                                            language === lang.code ? 'text-primary font-bold bg-primary/5' : 'text-gray-700'
                                        }`}
                                    >
                                        <span>{lang.name}</span>
                                        {language === lang.code && <span className="text-primary">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
