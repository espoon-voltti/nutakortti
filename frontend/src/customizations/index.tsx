import React from 'react'
import { CustomizableFormField, Language, Theme } from './types'
import espooLogo from './espoo-logo.svg'
import nuoriEspooLogoYellow from './nuoriespoo-logo-yellow.svg'
import nuoriEspooLogoBlack from './nuoriespoo-logo-black.svg'
import styled from 'styled-components'

export const languages: Language[] = ['fi', 'sv', 'en']
export const hiddenFormFields: CustomizableFormField[] = ['school', 'class', 'termsOfUse']

const TopLogo = styled(function TopLogo({ className }: { className?: string }) {
  return <img src={espooLogo} className={className} alt="Espoo logo" />
})`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
  @media (max-width: 599px) {
    width: 80px;
  }
  @media (min-width: 600px) {
    width: 100px;
  }
`

const BottomLogo = styled(function BottomLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <img src={nuoriEspooLogoYellow} alt="Nuori Espoo logo" />
    </div>
  )
})`
  position: relative;
  margin-top: 35px;
  width: 175px;
  height: 0;

  > img {
    position: absolute;
    width: 100%;
    margin: 0 auto;
    top: -10px;
    left: 0;
    right: 0;
  }
`

const LoginLogo = styled(function LoginLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <img src={nuoriEspooLogoBlack} alt="Nuori Espoo logo" />
    </div>
  )
})`
  margin-top: 50px;
  display: flex;
  justify-content: center;

  > img {
    width: 130px;
  }
`

const black = '#000000'
const white = '#ffffff'
const espooBlue = 'rgb(36, 159, 255)'
const espooYellow = 'rgb(255, 206, 0)'

export const theme: Theme = {
  pages: {
    login: {
      logo: <TopLogo />,
      stripe1: espooBlue,
      stripe2: black,
      background: espooYellow,
      languageSelectText: black,
      headingText: black,
      messageText: black,
      errorText: black,
      labelText: black,
      buttonBackground: espooBlue,
      buttonText: black,
      bottomLogo: <LoginLogo />,
    },
    qr: {
      stripe: espooYellow,
      background: white,
      languageSelectText: black,
      headingText: black,
      qrBorder: espooBlue,
      footerText: black,
    },
    parentRedirect: {
      logo: <TopLogo />,
      stripe1: espooYellow,
      stripe2: white,
      languageSelectText: black,
      background: white,
      headingText: black,
      ingressText: black,
      description: {
        background: espooBlue,
        text: black,
        buttonBackground: espooYellow,
        buttonText: black,
        bottomLogo: <BottomLogo />,
      }
    },
    registration: {
      stripe: espooYellow,
      background: white,
      languageSelectText: black,
      headingText: black,
      formTitleText: black,
      footerBackground: espooBlue,
      submitButtonBackground: espooYellow,
      submitButtonText: black,
      errorButtonBackground: espooBlue,
      errorButtonText: black,
      confirmationBackground: white,
      confirmationTitle: black,
      confirmationLink: black,
      bottomLogo: <BottomLogo />,
    }
  },
  fonts: {
    heading: "Lato, sans-serif",
    body: "'Work Sans', sans-serif",
  }
}
