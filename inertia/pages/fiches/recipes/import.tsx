import { Form, Link } from '@adonisjs/inertia/react'
import AppShell from '~/layouts/app_shell'
import FicheBreadcrumb from '~/components/domain/fiche_breadcrumb'
import Button, { buttonClasses } from '~/components/ui/button'
import Input from '~/components/ui/input'
import Page from '~/components/ui/page'

export default function RecipeImport() {
  return (
    <Page
      title="Importer une recette"
      breadcrumb={<FicheBreadcrumb type="recettes" />}
      description="Depuis une page de recette (Marmiton, 750g, un blog…) qui publie ses données schema.org."
    >
      <Form route="recipes.import.store">
        {({ errors, processing }) => (
          <div className="flex max-w-xl flex-col gap-5">
            <Input
              label="Adresse de la recette"
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              hint="Les ingrédients sont rapprochés du catalogue ; vous vérifiez tout avant d’enregistrer."
              error={errors.url}
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={processing}>
                {processing ? 'Lecture de la page…' : 'Lire la recette'}
              </Button>
              <Link route="recipes.index" className={buttonClasses('ghost')}>
                Annuler
              </Link>
            </div>
          </div>
        )}
      </Form>
    </Page>
  )
}

RecipeImport.layout = [AppShell]
