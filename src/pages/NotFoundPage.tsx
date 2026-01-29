import { Link } from 'react-router-dom';
import { AlertCircleIcon } from '@/components/icons';
import { useTranslations } from '@/hooks/useTranslations';

export function NotFoundPage() {
    const { t } = useTranslations();
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-null-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircleIcon size={40} className="text-red-600" />
                </div>
                <h1 className="text-6xl font-black text-[#3d1a7a] mb-4">{t('notFound.title')}</h1>
                <h2 className="text-2xl font-bold text-[#3d1a7a] mb-4">{t('notFound.pageNotFound')}</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    {t('notFound.description')}
                </p>
                <Link
                    to="/"
                    className="inline-block bg-black text-white px-8 py-3 rounded-null-xl font-bold hover:bg-gray-800 transition"
                >
                    {t('common.goBackHome')}
                </Link>
            </div>
        </div>
    );
}
