import type { ComponentType } from 'react'
import { urlFor } from '~/client'
import type { IconProps } from '~/components/icons/icon'
import AgendaIcon from '~/components/icons/agenda_icon'
import FichesIcon from '~/components/icons/fiches_icon'
import HomeIcon from '~/components/icons/home_icon'
import ListsIcon from '~/components/icons/lists_icon'
import MoneyIcon from '~/components/icons/money_icon'
import RecipeIcon from '~/components/icons/recipe_icon'
import ReviewIcon from '~/components/icons/review_icon'
import TodayIcon from '~/components/icons/today_icon'
import VehicleIcon from '~/components/icons/vehicle_icon'

export type NavItem = {
  label: string
  href: string
  icon: ComponentType<IconProps>
  match: (url: string) => boolean
}

function pathOf(url: string): string {
  const path = url.split(/[?#]/)[0]
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

/**
 * Active on the href itself and on every URL below it
 * (`/fiches/vehicules/3/modifier` activates « Véhicules »).
 */
function section(href: string): (url: string) => boolean {
  return (url) => {
    const path = pathOf(url)
    return path === href || path.startsWith(`${href}/`)
  }
}

function item(label: string, href: string, icon: ComponentType<IconProps>): NavItem {
  return { label, href, icon, match: section(href) }
}

const todayHref = urlFor('today')

/**
 * Navigation by dimension, never by domain.
 */
export const primaryNav: NavItem[] = [
  {
    label: 'Aujourd’hui',
    href: todayHref,
    icon: TodayIcon,
    match: (url) => pathOf(url) === todayHref,
  },
  item('Agenda', urlFor('agenda'), AgendaIcon),
  item('Argent', urlFor('money'), MoneyIcon),
  item('Listes', urlFor('lists'), ListsIcon),
]

/**
 * The daily review sits in the rail so that the streak stays one click
 * away.
 */
export const reviewNav: NavItem = item('Bilan du jour', urlFor('reviews.current'), ReviewIcon)

/**
 * The most used fiches.
 */
const pinnedFiches: NavItem[] = [
  item('Véhicules', urlFor('vehicles.index'), VehicleIcon),
  item('Logement', urlFor('homes.index'), HomeIcon),
  item('Recettes', urlFor('recipes.index'), RecipeIcon),
]

const fichesHref = urlFor('fiches.index')
const inFiches = section(fichesHref)

/**
 * « Toutes les fiches » covers the index and the fiches without their own
 * icon (comptes, factures…).
 */
export const ficheNav: NavItem[] = [
  ...pinnedFiches,
  {
    label: 'Toutes les fiches',
    href: fichesHref,
    icon: FichesIcon,
    match: (url) => inFiches(url) && !pinnedFiches.some((pinned) => pinned.match(url)),
  },
]

/**
 * Targets of the bottom bar on small screens, around the central « + ».
 * « Listes » moves into the « Plus » sheet with the rest.
 */
export const mobileNav: { start: NavItem[]; end: NavItem[]; inSheet: NavItem } = {
  start: primaryNav.slice(0, 2),
  end: primaryNav.slice(2, 3),
  inSheet: primaryNav[3],
}

const profileHref = urlFor('profile.show')
const reportsHref = urlFor('reports.current')
const newspaperHref = urlFor('newspapers.current')

/**
 * « Plus » is active on every page reached through its sheet.
 */
export function inMoreSheet(url: string): boolean {
  const path = pathOf(url)
  return (
    mobileNav.inSheet.match(url) ||
    reviewNav.match(url) ||
    ficheNav.some((fiche) => fiche.match(url)) ||
    inFiches(url) ||
    path === profileHref ||
    path.startsWith(reportsHref) ||
    path.startsWith(newspaperHref)
  )
}
