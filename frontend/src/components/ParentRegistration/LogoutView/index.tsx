import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wrapper, Header, Confirmation, Error } from '../StyledComponents'
import { useTranslations } from '../../translations'

// The backend redirects here after the Suomi.fi logout round trip. The service
// session is already over; the query parameter tells whether Suomi.fi
// confirmed its own logout or not.
const LogoutView: React.FC = (props) => {
    const t = useTranslations()
    const [searchParams] = useSearchParams()
    const suomifiLogoutFailed = searchParams.get('virhe') === 'suomifi'
    return (
        <Wrapper>
            <Header>{t.logout.title}</Header>
            {suomifiLogoutFailed ? (
                <Error>
                    <div>
                        <h2>{t.logout.suomifiFailed.heading}</h2>
                        <p>{t.logout.suomifiFailed.message}</p>
                    </div>
                </Error>
            ) : (
                <Confirmation>
                    <div>
                        <h2>{t.logout.heading}</h2>
                        <p>{t.logout.message}</p>
                    </div>
                </Confirmation>
            )}
        </Wrapper>
    )
}

export default LogoutView;
